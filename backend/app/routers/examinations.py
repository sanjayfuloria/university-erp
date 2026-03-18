"""
Examinations Router - Assessments, marks entry, grade computation, SGPA/CGPA
"""

from uuid import UUID
from typing import Optional, Any, Dict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.models import (
    Assessment, AssessmentType, AssessmentMark,
    CourseGrade, SemesterResult,
    CourseOffering, CourseRegistration, Course, Student,
    User, UserRole, UserProfile,
    GRADE_POINT_MAP, marks_to_grade,
)
from app.schemas.schemas import (
    AssessmentCreate, AssessmentResponse,
    MarkEntryRequest, AssessmentMarkResponse,
    CourseGradeResponse, StudentGradeCard, SemesterResultResponse,
    AssessmentBreakdown,
)
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


# ─── Helper: load student info ───────────────────────────────────────

async def _student_info(db: AsyncSession, student_id: UUID):
    r = await db.execute(
        select(Student).options(joinedload(Student.user).joinedload(User.profile))
        .where(Student.id == student_id)
    )
    s = r.unique().scalar_one_or_none()
    if not s:
        return None, None
    name = f"{s.user.profile.first_name} {s.user.profile.last_name}" if s.user and s.user.profile else None
    return name, s.roll_number


# ─── Assessments CRUD ────────────────────────────────────────────────

@router.get("/assessments", response_model=list[AssessmentResponse])
async def list_assessments(
    offering_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(Assessment).options(
        joinedload(Assessment.offering).joinedload(CourseOffering.course),
        joinedload(Assessment.marks),
    )
    if offering_id:
        q = q.where(Assessment.offering_id == offering_id)
    q = q.order_by(Assessment.date.desc().nullslast(), Assessment.created_at.desc())
    result = await db.execute(q)
    assessments = result.unique().scalars().all()

    responses = []
    for a in assessments:
        entered = [m for m in a.marks if m.marks_obtained is not None]
        avg = None
        if entered:
            avg = round(sum(m.marks_obtained for m in entered) / len(entered), 1)
        responses.append(AssessmentResponse(
            id=a.id, offering_id=a.offering_id,
            course_code=a.offering.course.code if a.offering and a.offering.course else None,
            course_name=a.offering.course.name if a.offering and a.offering.course else None,
            name=a.name, assessment_type=a.assessment_type.value,
            max_marks=a.max_marks, weightage=a.weightage,
            date=a.date, is_published=a.is_published,
            marks_entered=len(entered), class_average=avg,
        ))
    return responses


@router.post("/assessments", response_model=AssessmentResponse)
async def create_assessment(
    data: AssessmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN, UserRole.FACULTY)),
):
    # Validate total weightage doesn't exceed 100
    existing = await db.execute(
        select(func.coalesce(func.sum(Assessment.weightage), 0))
        .where(Assessment.offering_id == data.offering_id)
    )
    current_total = existing.scalar() or 0
    if current_total + data.weightage > 100.01:
        raise HTTPException(400, f"Total weightage would be {current_total + data.weightage}%. Maximum is 100%.")

    assessment = Assessment(
        offering_id=data.offering_id,
        name=data.name,
        assessment_type=AssessmentType(data.assessment_type),
        max_marks=data.max_marks,
        weightage=data.weightage,
        date=data.date,
    )
    db.add(assessment)
    await db.commit()

    r = await db.execute(
        select(Assessment).options(
            joinedload(Assessment.offering).joinedload(CourseOffering.course),
        ).where(Assessment.id == assessment.id)
    )
    a = r.unique().scalar_one()
    return AssessmentResponse(
        id=a.id, offering_id=a.offering_id,
        course_code=a.offering.course.code if a.offering and a.offering.course else None,
        course_name=a.offering.course.name if a.offering and a.offering.course else None,
        name=a.name, assessment_type=a.assessment_type.value,
        max_marks=a.max_marks, weightage=a.weightage,
        date=a.date, is_published=a.is_published,
        marks_entered=0, class_average=None,
    )


@router.post("/assessments/{assessment_id}/publish")
async def publish_assessment(
    assessment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN, UserRole.FACULTY)),
):
    r = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    a = r.scalar_one_or_none()
    if not a:
        raise HTTPException(404, "Assessment not found")
    a.is_published = True
    await db.commit()
    return {"published": True}


# ─── Marks Entry ─────────────────────────────────────────────────────

@router.post("/marks", response_model=list[AssessmentMarkResponse])
async def enter_marks(
    data: MarkEntryRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN, UserRole.FACULTY)),
):
    # Get assessment for max_marks
    a_r = await db.execute(select(Assessment).where(Assessment.id == data.assessment_id))
    assessment = a_r.scalar_one_or_none()
    if not assessment:
        raise HTTPException(404, "Assessment not found")

    results = []
    for entry in data.entries:
        student_id = UUID(entry["student_id"])
        marks = entry.get("marks_obtained")
        if marks is not None:
            marks = float(marks)
            if marks > assessment.max_marks:
                raise HTTPException(400, f"Marks {marks} exceed maximum {assessment.max_marks}")
        remarks = entry.get("remarks")

        # Upsert
        existing = await db.execute(
            select(AssessmentMark).where(
                AssessmentMark.assessment_id == data.assessment_id,
                AssessmentMark.student_id == student_id,
            )
        )
        mark = existing.scalar_one_or_none()
        if mark:
            mark.marks_obtained = marks
            mark.remarks = remarks
            mark.graded_by = user.id
            mark.graded_at = datetime.utcnow()
        else:
            mark = AssessmentMark(
                assessment_id=data.assessment_id,
                student_id=student_id,
                marks_obtained=marks,
                remarks=remarks,
                graded_by=user.id,
            )
            db.add(mark)

    await db.commit()

    # Reload all marks for this assessment
    all_marks = await db.execute(
        select(AssessmentMark).where(AssessmentMark.assessment_id == data.assessment_id)
    )
    for m in all_marks.scalars().all():
        name, roll = await _student_info(db, m.student_id)
        pct = round((m.marks_obtained / assessment.max_marks * 100), 1) if m.marks_obtained is not None else None
        results.append(AssessmentMarkResponse(
            id=m.id, assessment_id=m.assessment_id, student_id=m.student_id,
            student_name=name, roll_number=roll,
            marks_obtained=m.marks_obtained, max_marks=assessment.max_marks,
            percentage=pct, remarks=m.remarks,
        ))

    return sorted(results, key=lambda r: r.roll_number or "")


@router.get("/marks/{assessment_id}", response_model=list[AssessmentMarkResponse])
async def get_marks(
    assessment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    a_r = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = a_r.scalar_one_or_none()
    if not assessment:
        raise HTTPException(404, "Assessment not found")

    marks = await db.execute(
        select(AssessmentMark).where(AssessmentMark.assessment_id == assessment_id)
    )
    results = []
    for m in marks.scalars().all():
        name, roll = await _student_info(db, m.student_id)
        pct = round((m.marks_obtained / assessment.max_marks * 100), 1) if m.marks_obtained is not None else None
        results.append(AssessmentMarkResponse(
            id=m.id, assessment_id=m.assessment_id, student_id=m.student_id,
            student_name=name, roll_number=roll,
            marks_obtained=m.marks_obtained, max_marks=assessment.max_marks,
            percentage=pct, remarks=m.remarks,
        ))
    return sorted(results, key=lambda r: r.roll_number or "")


# ─── Grade Computation ───────────────────────────────────────────────

@router.post("/compute-grades/{offering_id}", response_model=list[CourseGradeResponse])
async def compute_course_grades(
    offering_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    """Compute final grades for all students in a course offering."""
    # Get offering + course credits
    off_r = await db.execute(
        select(CourseOffering).options(joinedload(CourseOffering.course))
        .where(CourseOffering.id == offering_id)
    )
    offering = off_r.unique().scalar_one_or_none()
    if not offering or not offering.course:
        raise HTTPException(404, "Offering not found")

    credits = offering.course.credits

    # Get all assessments for this offering
    assess_r = await db.execute(
        select(Assessment).options(joinedload(Assessment.marks))
        .where(Assessment.offering_id == offering_id)
    )
    assessments = assess_r.unique().scalars().all()

    if not assessments:
        raise HTTPException(400, "No assessments found for this offering")

    # Get registered students
    reg_r = await db.execute(
        select(CourseRegistration).where(
            CourseRegistration.offering_id == offering_id,
            CourseRegistration.is_dropped == False,
        )
    )
    student_ids = [r.student_id for r in reg_r.scalars().all()]

    results = []
    for sid in student_ids:
        total_weighted = 0
        for a in assessments:
            mark = next((m for m in a.marks if m.student_id == sid), None)
            if mark and mark.marks_obtained is not None:
                pct = (mark.marks_obtained / a.max_marks) * 100
                weighted = (pct * a.weightage) / 100
                total_weighted += weighted

        total_weighted = round(total_weighted, 2)
        grade = marks_to_grade(total_weighted)
        gp = GRADE_POINT_MAP.get(grade, 0)

        # Upsert course grade
        existing = await db.execute(
            select(CourseGrade).where(
                CourseGrade.offering_id == offering_id,
                CourseGrade.student_id == sid,
            )
        )
        cg = existing.scalar_one_or_none()
        if cg:
            cg.total_weighted_marks = total_weighted
            cg.grade = grade
            cg.grade_point = gp
            cg.credits = credits
        else:
            cg = CourseGrade(
                offering_id=offering_id, student_id=sid,
                total_weighted_marks=total_weighted,
                grade=grade, grade_point=gp, credits=credits,
            )
            db.add(cg)

        name, roll = await _student_info(db, sid)
        results.append(CourseGradeResponse(
            id=cg.id if cg.id else UUID(int=0), offering_id=offering_id,
            course_code=offering.course.code, course_name=offering.course.name,
            credits=credits, student_id=sid,
            student_name=name, roll_number=roll,
            total_weighted_marks=total_weighted, grade=grade, grade_point=gp,
            is_finalized=cg.is_finalized if cg else False,
        ))

    await db.commit()
    return sorted(results, key=lambda r: r.roll_number or "")


@router.get("/grades/{offering_id}", response_model=list[CourseGradeResponse])
async def get_course_grades(
    offering_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    off_r = await db.execute(
        select(CourseOffering).options(joinedload(CourseOffering.course))
        .where(CourseOffering.id == offering_id)
    )
    offering = off_r.unique().scalar_one_or_none()

    grades = await db.execute(
        select(CourseGrade).where(CourseGrade.offering_id == offering_id)
    )
    results = []
    for cg in grades.scalars().all():
        name, roll = await _student_info(db, cg.student_id)
        results.append(CourseGradeResponse(
            id=cg.id, offering_id=cg.offering_id,
            course_code=offering.course.code if offering and offering.course else None,
            course_name=offering.course.name if offering and offering.course else None,
            credits=cg.credits, student_id=cg.student_id,
            student_name=name, roll_number=roll,
            total_weighted_marks=cg.total_weighted_marks,
            grade=cg.grade, grade_point=cg.grade_point,
            is_finalized=cg.is_finalized,
        ))
    return sorted(results, key=lambda r: r.roll_number or "")


# ─── SGPA / CGPA Computation ─────────────────────────────────────────

@router.post("/compute-sgpa/{student_id}", response_model=SemesterResultResponse)
async def compute_sgpa(
    student_id: UUID,
    semester: int = 1,
    academic_year: str = "2025-2026",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    """Compute SGPA and CGPA for a student."""
    # Gather all course grades for this student in this semester
    grades = await db.execute(
        select(CourseGrade)
        .join(CourseOffering)
        .where(
            CourseGrade.student_id == student_id,
            CourseOffering.semester == semester,
            CourseOffering.academic_year == academic_year,
        )
    )
    course_grades = grades.scalars().all()

    if not course_grades:
        raise HTTPException(400, "No course grades found. Compute course grades first.")

    total_credits = sum(cg.credits for cg in course_grades)
    total_points = sum(cg.grade_point * cg.credits for cg in course_grades)
    sgpa = round(total_points / total_credits, 2) if total_credits > 0 else 0

    # CGPA: include all previous semesters
    prev_results = await db.execute(
        select(SemesterResult).where(
            SemesterResult.student_id == student_id,
            SemesterResult.semester < semester,
        ).order_by(SemesterResult.semester)
    )
    prev = prev_results.scalars().all()

    cumulative_credits = sum(p.total_credits_earned for p in prev) + total_credits
    cumulative_points = sum(p.total_grade_points for p in prev) + total_points
    cgpa = round(cumulative_points / cumulative_credits, 2) if cumulative_credits > 0 else 0

    # Upsert
    existing = await db.execute(
        select(SemesterResult).where(
            SemesterResult.student_id == student_id,
            SemesterResult.semester == semester,
            SemesterResult.academic_year == academic_year,
        )
    )
    sr = existing.scalar_one_or_none()
    if sr:
        sr.total_credits_earned = total_credits
        sr.total_grade_points = total_points
        sr.sgpa = sgpa
        sr.cgpa = cgpa
        sr.total_credits_cumulative = cumulative_credits
        sr.total_points_cumulative = cumulative_points
    else:
        sr = SemesterResult(
            student_id=student_id, semester=semester,
            academic_year=academic_year,
            total_credits_earned=total_credits,
            total_grade_points=total_points,
            sgpa=sgpa, cgpa=cgpa,
            total_credits_cumulative=cumulative_credits,
            total_points_cumulative=cumulative_points,
        )
        db.add(sr)

    await db.commit()
    await db.refresh(sr)

    name, roll = await _student_info(db, student_id)
    return SemesterResultResponse(
        id=sr.id, student_id=sr.student_id,
        student_name=name, roll_number=roll,
        semester=sr.semester, academic_year=sr.academic_year,
        total_credits_earned=sr.total_credits_earned,
        sgpa=sr.sgpa, cgpa=sr.cgpa,
        is_finalized=sr.is_finalized,
    )


@router.get("/grade-card/{student_id}", response_model=StudentGradeCard)
async def get_grade_card(
    student_id: UUID,
    semester: int = 1,
    academic_year: str = "2025-2026",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Full grade card for a student for a semester."""
    st = await db.execute(
        select(Student).options(
            joinedload(Student.user).joinedload(User.profile),
            joinedload(Student.program),
        ).where(Student.id == student_id)
    )
    student = st.unique().scalar_one_or_none()
    if not student:
        raise HTTPException(404, "Student not found")

    name = f"{student.user.profile.first_name} {student.user.profile.last_name}" if student.user and student.user.profile else None

    # Get course grades
    grades = await db.execute(
        select(CourseGrade)
        .join(CourseOffering)
        .options(joinedload(CourseGrade.offering).joinedload(CourseOffering.course))
        .where(
            CourseGrade.student_id == student_id,
            CourseOffering.semester == semester,
            CourseOffering.academic_year == academic_year,
        )
    )
    course_grades = grades.unique().scalars().all()

    courses = []
    for cg in course_grades:
        courses.append(CourseGradeResponse(
            id=cg.id, offering_id=cg.offering_id,
            course_code=cg.offering.course.code if cg.offering and cg.offering.course else None,
            course_name=cg.offering.course.name if cg.offering and cg.offering.course else None,
            credits=cg.credits, student_id=cg.student_id,
            student_name=name, roll_number=student.roll_number,
            total_weighted_marks=cg.total_weighted_marks,
            grade=cg.grade, grade_point=cg.grade_point,
            is_finalized=cg.is_finalized,
        ))

    total_credits = sum(c.credits for c in courses)
    total_points = sum(c.grade_point * c.credits for c in courses)
    sgpa = round(total_points / total_credits, 2) if total_credits > 0 else 0

    # CGPA from semester_results
    sr = await db.execute(
        select(SemesterResult).where(
            SemesterResult.student_id == student_id,
            SemesterResult.semester == semester,
        )
    )
    sem_result = sr.scalar_one_or_none()
    cgpa = sem_result.cgpa if sem_result else sgpa

    # Cumulative credits
    all_sr = await db.execute(
        select(SemesterResult).where(SemesterResult.student_id == student_id)
    )
    cum_credits = sum(s.total_credits_earned for s in all_sr.scalars().all())
    if cum_credits == 0:
        cum_credits = total_credits

    return StudentGradeCard(
        student_id=student_id,
        student_name=name,
        roll_number=student.roll_number,
        program_name=student.program.name if student.program else None,
        semester=semester,
        academic_year=academic_year,
        courses=sorted(courses, key=lambda c: c.course_code or ""),
        sgpa=sgpa, cgpa=cgpa,
        total_credits=total_credits,
        total_credits_cumulative=cum_credits,
    )
