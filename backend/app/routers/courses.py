"""
Courses Router - Course catalog and offering management
"""

from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.models import (
    Course, CourseOffering, CourseRegistration, Program,
    User, UserRole, UserProfile, Student
)
from app.schemas.schemas import (
    CourseCreate, CourseResponse,
    CourseOfferingCreate, CourseOfferingResponse,
    CourseRegistrationCreate, CourseRegistrationResponse
)
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


# ─── Courses ─────────────────────────────────────────────────────────

@router.get("/", response_model=list[CourseResponse])
async def list_courses(
    program_id: Optional[UUID] = None,
    semester: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(Course).options(joinedload(Course.program)).where(Course.is_active == True)
    if program_id:
        q = q.where(Course.program_id == program_id)
    if semester:
        q = q.where(Course.semester == semester)
    q = q.order_by(Course.code)
    result = await db.execute(q)
    courses = result.unique().scalars().all()
    return [
        CourseResponse(
            id=c.id, code=c.code, name=c.name, program_id=c.program_id,
            program_name=c.program.name if c.program else None,
            semester=c.semester, credits=c.credits, course_type=c.course_type,
            description=c.description, max_students=c.max_students, is_active=c.is_active,
        ) for c in courses
    ]


@router.post("/", response_model=CourseResponse)
async def create_course(
    data: CourseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    course = Course(**data.model_dump())
    db.add(course)
    await db.commit()
    await db.refresh(course)
    prog = await db.execute(select(Program).where(Program.id == course.program_id))
    prog = prog.scalar_one_or_none()
    return CourseResponse(
        id=course.id, code=course.code, name=course.name, program_id=course.program_id,
        program_name=prog.name if prog else None,
        semester=course.semester, credits=course.credits, course_type=course.course_type,
        description=course.description, max_students=course.max_students, is_active=course.is_active,
    )


# ─── Course Offerings ────────────────────────────────────────────────

@router.get("/offerings", response_model=list[CourseOfferingResponse])
async def list_offerings(
    semester: Optional[int] = None,
    faculty_id: Optional[UUID] = None,
    program_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = (
        select(CourseOffering)
        .options(
            joinedload(CourseOffering.course).joinedload(Course.program),
            joinedload(CourseOffering.faculty).joinedload(User.profile),
            joinedload(CourseOffering.registrations),
        )
        .where(CourseOffering.is_active == True)
    )
    if semester:
        q = q.where(CourseOffering.semester == semester)
    if faculty_id:
        q = q.where(CourseOffering.faculty_id == faculty_id)
    if program_id:
        q = q.join(Course).where(Course.program_id == program_id)

    result = await db.execute(q)
    offerings = result.unique().scalars().all()

    return [
        CourseOfferingResponse(
            id=o.id, course_id=o.course_id,
            course_code=o.course.code if o.course else None,
            course_name=o.course.name if o.course else None,
            faculty_id=o.faculty_id,
            faculty_name=f"{o.faculty.profile.first_name} {o.faculty.profile.last_name}" if o.faculty and o.faculty.profile else None,
            academic_year=o.academic_year, semester=o.semester, section=o.section,
            room_number=o.room_number, is_active=o.is_active,
            registered_count=len([r for r in o.registrations if not r.is_dropped]),
            program_name=o.course.program.name if o.course and o.course.program else None,
        ) for o in offerings
    ]


@router.post("/offerings", response_model=CourseOfferingResponse)
async def create_offering(
    data: CourseOfferingCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    offering = CourseOffering(**data.model_dump())
    db.add(offering)
    await db.commit()

    result = await db.execute(
        select(CourseOffering)
        .options(
            joinedload(CourseOffering.course).joinedload(Course.program),
            joinedload(CourseOffering.faculty).joinedload(User.profile),
        )
        .where(CourseOffering.id == offering.id)
    )
    o = result.unique().scalar_one()
    return CourseOfferingResponse(
        id=o.id, course_id=o.course_id,
        course_code=o.course.code if o.course else None,
        course_name=o.course.name if o.course else None,
        faculty_id=o.faculty_id,
        faculty_name=f"{o.faculty.profile.first_name} {o.faculty.profile.last_name}" if o.faculty and o.faculty.profile else None,
        academic_year=o.academic_year, semester=o.semester, section=o.section,
        room_number=o.room_number, is_active=o.is_active, registered_count=0,
        program_name=o.course.program.name if o.course and o.course.program else None,
    )


# ─── Course Registration ─────────────────────────────────────────────

@router.get("/offerings/{offering_id}/students", response_model=list[CourseRegistrationResponse])
async def list_registered_students(
    offering_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = (
        select(CourseRegistration)
        .options(
            joinedload(CourseRegistration.student).joinedload(Student.user).joinedload(User.profile),
            joinedload(CourseRegistration.offering).joinedload(CourseOffering.course),
        )
        .where(CourseRegistration.offering_id == offering_id)
        .where(CourseRegistration.is_dropped == False)
    )
    result = await db.execute(q)
    regs = result.unique().scalars().all()
    return [
        CourseRegistrationResponse(
            id=r.id, student_id=r.student_id,
            student_name=f"{r.student.user.profile.first_name} {r.student.user.profile.last_name}" if r.student and r.student.user and r.student.user.profile else None,
            roll_number=r.student.roll_number if r.student else None,
            offering_id=r.offering_id,
            course_name=r.offering.course.name if r.offering and r.offering.course else None,
            registered_at=r.registered_at, is_dropped=r.is_dropped,
        ) for r in regs
    ]


@router.post("/register", response_model=CourseRegistrationResponse)
async def register_student(
    data: CourseRegistrationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Verify offering exists
    off_result = await db.execute(
        select(CourseOffering).options(joinedload(CourseOffering.course))
        .where(CourseOffering.id == data.offering_id)
    )
    offering = off_result.unique().scalar_one_or_none()
    if not offering:
        raise HTTPException(404, "Course offering not found")

    # Check duplicate
    existing = await db.execute(
        select(CourseRegistration).where(
            CourseRegistration.student_id == data.student_id,
            CourseRegistration.offering_id == data.offering_id,
            CourseRegistration.is_dropped == False,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Student already registered for this course")

    reg = CourseRegistration(student_id=data.student_id, offering_id=data.offering_id)
    db.add(reg)
    await db.commit()
    await db.refresh(reg)

    # Load student info
    st_result = await db.execute(
        select(Student).options(joinedload(Student.user).joinedload(User.profile))
        .where(Student.id == data.student_id)
    )
    student = st_result.unique().scalar_one_or_none()

    return CourseRegistrationResponse(
        id=reg.id, student_id=reg.student_id,
        student_name=f"{student.user.profile.first_name} {student.user.profile.last_name}" if student and student.user and student.user.profile else None,
        roll_number=student.roll_number if student else None,
        offering_id=reg.offering_id,
        course_name=offering.course.name if offering.course else None,
        registered_at=reg.registered_at, is_dropped=reg.is_dropped,
    )


@router.post("/register/bulk/{offering_id}")
async def bulk_register_students(
    offering_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    """Auto-register all active students of the matching program/semester into an offering."""
    off_result = await db.execute(
        select(CourseOffering).options(joinedload(CourseOffering.course))
        .where(CourseOffering.id == offering_id)
    )
    offering = off_result.unique().scalar_one_or_none()
    if not offering or not offering.course:
        raise HTTPException(404, "Offering not found")

    # Find eligible students
    students = await db.execute(
        select(Student).where(
            Student.program_id == offering.course.program_id,
            Student.current_semester == offering.semester,
            Student.is_active == True,
        )
    )
    students = students.scalars().all()
    registered = 0
    for s in students:
        existing = await db.execute(
            select(CourseRegistration).where(
                CourseRegistration.student_id == s.id,
                CourseRegistration.offering_id == offering_id,
            )
        )
        if not existing.scalar_one_or_none():
            db.add(CourseRegistration(student_id=s.id, offering_id=offering_id))
            registered += 1

    await db.commit()
    return {"registered": registered, "total_eligible": len(students)}
