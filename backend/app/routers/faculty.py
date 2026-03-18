"""
Faculty Router - Profiles, publications, leave management, workload
"""

from uuid import UUID
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.models import (
    FacultyProfile, Publication, LeaveApplication, LeaveType, LeaveStatus,
    CourseOffering, CourseRegistration, TimetableSlot, Course,
    User, UserRole, UserProfile,
)
from app.schemas.schemas import (
    FacultyProfileCreate, FacultyProfileResponse,
    PublicationCreate, PublicationResponse,
    LeaveApplicationCreate, LeaveApplicationResponse,
    FacultyWorkloadResponse,
)
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


# ─── Faculty Profiles ────────────────────────────────────────────────

@router.get("/profiles", response_model=list[FacultyProfileResponse])
async def list_faculty_profiles(
    department: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(FacultyProfile).options(
        joinedload(FacultyProfile.user).joinedload(User.profile),
        joinedload(FacultyProfile.publications),
    ).where(FacultyProfile.is_active == True)
    if department:
        q = q.where(FacultyProfile.department == department)

    result = await db.execute(q)
    profiles = result.unique().scalars().all()

    responses = []
    for fp in profiles:
        name = f"{fp.user.profile.first_name} {fp.user.profile.last_name}" if fp.user and fp.user.profile else None
        # Count courses
        courses_count = (await db.execute(
            select(func.count(CourseOffering.id)).where(
                CourseOffering.faculty_id == fp.user_id,
                CourseOffering.is_active == True,
            )
        )).scalar() or 0

        responses.append(FacultyProfileResponse(
            id=fp.id, user_id=fp.user_id, name=name,
            email=fp.user.email if fp.user else None,
            employee_id=fp.employee_id, department=fp.department,
            designation=fp.designation, qualification=fp.qualification,
            specialization=fp.specialization, date_of_joining=fp.date_of_joining,
            experience_years=fp.experience_years,
            research_interests=fp.research_interests,
            courses_count=courses_count,
            publications_count=len(fp.publications) if fp.publications else 0,
        ))
    return responses


@router.post("/profiles", response_model=FacultyProfileResponse)
async def create_faculty_profile(
    data: FacultyProfileCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    fp = FacultyProfile(**data.model_dump())
    db.add(fp)
    await db.commit()
    await db.refresh(fp)
    u = await db.execute(select(User).options(joinedload(User.profile)).where(User.id == fp.user_id))
    usr = u.unique().scalar_one_or_none()
    name = f"{usr.profile.first_name} {usr.profile.last_name}" if usr and usr.profile else None
    return FacultyProfileResponse(
        id=fp.id, user_id=fp.user_id, name=name,
        email=usr.email if usr else None,
        employee_id=fp.employee_id, department=fp.department,
        designation=fp.designation, qualification=fp.qualification,
        specialization=fp.specialization, date_of_joining=fp.date_of_joining,
        experience_years=fp.experience_years,
        research_interests=fp.research_interests,
        courses_count=0, publications_count=0,
    )


# ─── Publications ────────────────────────────────────────────────────

@router.get("/publications/{faculty_profile_id}", response_model=list[PublicationResponse])
async def list_publications(
    faculty_profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Publication).where(Publication.faculty_id == faculty_profile_id)
        .order_by(Publication.year.desc())
    )
    return [PublicationResponse.model_validate(p) for p in result.scalars().all()]


@router.post("/publications/{faculty_profile_id}", response_model=PublicationResponse)
async def add_publication(
    faculty_profile_id: UUID,
    data: PublicationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pub = Publication(faculty_id=faculty_profile_id, **data.model_dump())
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    return PublicationResponse.model_validate(pub)


# ─── Leave Management ────────────────────────────────────────────────

@router.get("/leaves", response_model=list[LeaveApplicationResponse])
async def list_leaves(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(LeaveApplication).options(
        joinedload(LeaveApplication.applicant).joinedload(User.profile),
        joinedload(LeaveApplication.approver).joinedload(User.profile),
    )
    if user.role == UserRole.FACULTY:
        q = q.where(LeaveApplication.applicant_id == user.id)
    if status:
        q = q.where(LeaveApplication.status == LeaveStatus(status))
    q = q.order_by(LeaveApplication.created_at.desc())

    result = await db.execute(q)
    leaves = result.unique().scalars().all()

    return [
        LeaveApplicationResponse(
            id=l.id, applicant_id=l.applicant_id,
            applicant_name=f"{l.applicant.profile.first_name} {l.applicant.profile.last_name}" if l.applicant and l.applicant.profile else None,
            leave_type=l.leave_type.value, start_date=l.start_date, end_date=l.end_date,
            num_days=l.num_days, reason=l.reason, status=l.status.value,
            approved_by=l.approved_by,
            approver_name=f"{l.approver.profile.first_name} {l.approver.profile.last_name}" if l.approver and l.approver.profile else None,
            remarks=l.remarks, created_at=l.created_at,
        ) for l in leaves
    ]


@router.post("/leaves", response_model=LeaveApplicationResponse)
async def apply_leave(
    data: LeaveApplicationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    num_days = (data.end_date - data.start_date).days + 1
    if num_days <= 0:
        raise HTTPException(400, "End date must be after start date")

    leave = LeaveApplication(
        applicant_id=user.id,
        leave_type=LeaveType(data.leave_type),
        start_date=data.start_date, end_date=data.end_date,
        num_days=num_days, reason=data.reason,
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)

    u = await db.execute(select(User).options(joinedload(User.profile)).where(User.id == user.id))
    usr = u.unique().scalar_one()
    name = f"{usr.profile.first_name} {usr.profile.last_name}" if usr.profile else None

    return LeaveApplicationResponse(
        id=leave.id, applicant_id=leave.applicant_id, applicant_name=name,
        leave_type=leave.leave_type.value, start_date=leave.start_date,
        end_date=leave.end_date, num_days=leave.num_days, reason=leave.reason,
        status=leave.status.value, approved_by=None, approver_name=None,
        remarks=None, created_at=leave.created_at,
    )


@router.post("/leaves/{leave_id}/approve")
async def approve_leave(
    leave_id: UUID,
    action: str = "approved",  # approved or rejected
    remarks: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    result = await db.execute(select(LeaveApplication).where(LeaveApplication.id == leave_id))
    leave = result.scalar_one_or_none()
    if not leave:
        raise HTTPException(404, "Leave application not found")
    if leave.status != LeaveStatus.PENDING:
        raise HTTPException(400, "Can only act on pending applications")

    leave.status = LeaveStatus(action)
    leave.approved_by = user.id
    leave.approved_at = datetime.utcnow()
    leave.remarks = remarks
    await db.commit()
    return {"status": action, "leave_id": str(leave_id)}


# ─── Workload Summary ───────────────────────────────────────────────

@router.get("/workload", response_model=list[FacultyWorkloadResponse])
async def get_workload_summary(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    faculty_users = await db.execute(
        select(User).options(joinedload(User.profile))
        .where(User.role == UserRole.FACULTY, User.is_active == True)
    )

    results = []
    for fac in faculty_users.unique().scalars().all():
        name = f"{fac.profile.first_name} {fac.profile.last_name}" if fac.profile else None

        # Faculty profile
        fp_r = await db.execute(select(FacultyProfile).where(FacultyProfile.user_id == fac.id))
        fp = fp_r.scalar_one_or_none()

        # Courses
        offerings = await db.execute(
            select(CourseOffering).options(joinedload(CourseOffering.registrations))
            .where(CourseOffering.faculty_id == fac.id, CourseOffering.is_active == True)
        )
        offs = offerings.unique().scalars().all()
        total_students = sum(len([r for r in o.registrations if not r.is_dropped]) for o in offs)

        # Timetable hours
        slots = await db.execute(
            select(TimetableSlot).join(CourseOffering)
            .where(CourseOffering.faculty_id == fac.id)
        )
        weekly_hours = len(slots.scalars().all())

        # Publications
        pub_count = 0
        if fp:
            pub_count = (await db.execute(
                select(func.count(Publication.id)).where(Publication.faculty_id == fp.id)
            )).scalar() or 0

        results.append(FacultyWorkloadResponse(
            faculty_id=fac.id, faculty_name=name,
            designation=fp.designation if fp else None,
            department=fp.department if fp else None,
            courses_assigned=len(offs),
            total_students=total_students,
            weekly_hours=weekly_hours,
            publications=pub_count,
        ))
    return sorted(results, key=lambda r: r.courses_assigned, reverse=True)
