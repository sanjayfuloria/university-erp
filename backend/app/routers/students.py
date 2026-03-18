"""
Students Router - Post-admission student records
"""

from uuid import UUID
from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.models import (
    Student, Application, ApplicationStatus, User, UserRole,
    UserProfile, Program
)
from app.schemas.schemas import StudentResponse
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


@router.post("/enroll/{app_id}", response_model=StudentResponse)
async def enroll_student(
    app_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    """Convert an accepted application into a student record."""
    result = await db.execute(
        select(Application).options(
            joinedload(Application.applicant).joinedload(User.profile),
            joinedload(Application.program),
        ).where(Application.id == app_id)
    )
    app = result.unique().scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")
    if app.status != ApplicationStatus.ACCEPTED:
        raise HTTPException(400, "Application must be in ACCEPTED status to enroll")

    # Check if already enrolled
    existing = await db.execute(
        select(Student).where(Student.application_id == app_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Student already enrolled from this application")

    # Generate roll number
    import random
    batch_year = date.today().year
    prog_code = app.program.code if app.program else "GEN"
    roll = f"{prog_code}-{batch_year}-{random.randint(1000, 9999)}"

    # Update user role
    applicant = app.applicant
    applicant.role = UserRole.STUDENT

    student = Student(
        user_id=app.applicant_id,
        application_id=app_id,
        roll_number=roll,
        program_id=app.program_id,
        batch_year=batch_year,
        current_semester=1,
        admission_date=date.today(),
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)

    profile = app.applicant.profile
    return StudentResponse(
        id=student.id,
        roll_number=student.roll_number,
        program_name=app.program.name if app.program else None,
        batch_year=student.batch_year,
        current_semester=student.current_semester,
        is_active=student.is_active,
        admission_date=student.admission_date,
        student_name=f"{profile.first_name} {profile.last_name}" if profile else None,
        email=applicant.email,
    )


@router.get("/", response_model=list[StudentResponse])
async def list_students(
    program_id: Optional[UUID] = None,
    batch_year: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN, UserRole.FACULTY)),
):
    q = select(Student).options(
        joinedload(Student.user).joinedload(User.profile),
        joinedload(Student.program),
    )
    if program_id:
        q = q.where(Student.program_id == program_id)
    if batch_year:
        q = q.where(Student.batch_year == batch_year)
    q = q.order_by(Student.roll_number).offset(skip).limit(limit)

    result = await db.execute(q)
    students = result.unique().scalars().all()

    return [
        StudentResponse(
            id=s.id,
            roll_number=s.roll_number,
            program_name=s.program.name if s.program else None,
            batch_year=s.batch_year,
            current_semester=s.current_semester,
            is_active=s.is_active,
            admission_date=s.admission_date,
            student_name=f"{s.user.profile.first_name} {s.user.profile.last_name}" if s.user and s.user.profile else None,
            email=s.user.email if s.user else None,
        )
        for s in students
    ]
