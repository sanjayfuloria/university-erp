"""
Applications Router - Full admission application lifecycle
"""

import random
import string
from uuid import UUID
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.models import (
    Application, ApplicationStatus, Program, User, UserRole,
    UserProfile, ApplicationReview, AdmissionOffer
)
from app.schemas.schemas import (
    ApplicationCreate, ApplicationUpdate, ApplicationResponse,
    ReviewResponse, OfferResponse
)
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


def generate_app_number():
    year = datetime.now().year
    rand = ''.join(random.choices(string.digits, k=6))
    return f"APP-{year}-{rand}"


def build_application_response(app: Application) -> ApplicationResponse:
    applicant_name = None
    if app.applicant and app.applicant.profile:
        p = app.applicant.profile
        applicant_name = f"{p.first_name} {p.last_name}"

    reviews = []
    if app.reviews:
        reviews = [ReviewResponse.model_validate(r) for r in app.reviews]

    offer = None
    if app.offer:
        offer = OfferResponse.model_validate(app.offer)

    return ApplicationResponse(
        id=app.id,
        application_number=app.application_number,
        applicant_id=app.applicant_id,
        program_id=app.program_id,
        program_name=app.program.name if app.program else None,
        academic_year=app.academic_year,
        status=app.status.value,
        tenth_board=app.tenth_board,
        tenth_percentage=app.tenth_percentage,
        tenth_year=app.tenth_year,
        twelfth_board=app.twelfth_board,
        twelfth_percentage=app.twelfth_percentage,
        twelfth_year=app.twelfth_year,
        graduation_university=app.graduation_university,
        graduation_degree=app.graduation_degree,
        graduation_percentage=app.graduation_percentage,
        graduation_year=app.graduation_year,
        entrance_exam=app.entrance_exam,
        entrance_score=app.entrance_score,
        statement_of_purpose=app.statement_of_purpose,
        applicant_name=applicant_name,
        submitted_at=app.submitted_at,
        created_at=app.created_at,
        reviews=reviews,
        offer=offer,
    )


@router.get("/", response_model=list[ApplicationResponse])
async def list_applications(
    status: Optional[str] = None,
    program_id: Optional[UUID] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(Application).options(
        joinedload(Application.program),
        joinedload(Application.applicant).joinedload(User.profile),
        joinedload(Application.reviews),
        joinedload(Application.offer),
    )

    # Applicants can only see their own
    if user.role == UserRole.APPLICANT:
        q = q.where(Application.applicant_id == user.id)

    if status:
        q = q.where(Application.status == status)
    if program_id:
        q = q.where(Application.program_id == program_id)

    q = q.order_by(Application.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    apps = result.unique().scalars().all()
    return [build_application_response(a) for a in apps]


@router.post("/", response_model=ApplicationResponse)
async def create_application(
    data: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Verify program exists
    prog_result = await db.execute(select(Program).where(Program.id == data.program_id))
    prog = prog_result.scalar_one_or_none()
    if not prog:
        raise HTTPException(404, "Program not found")

    app = Application(
        application_number=generate_app_number(),
        applicant_id=user.id,
        **data.model_dump(),
    )
    db.add(app)
    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Application).options(
            joinedload(Application.program),
            joinedload(Application.applicant).joinedload(User.profile),
            joinedload(Application.reviews),
            joinedload(Application.offer),
        ).where(Application.id == app.id)
    )
    app = result.unique().scalar_one()
    return build_application_response(app)


@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(
    app_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Application).options(
            joinedload(Application.program),
            joinedload(Application.applicant).joinedload(User.profile),
            joinedload(Application.reviews),
            joinedload(Application.offer),
        ).where(Application.id == app_id)
    )
    app = result.unique().scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    # Applicants can only see their own
    if user.role == UserRole.APPLICANT and app.applicant_id != user.id:
        raise HTTPException(403, "Access denied")

    return build_application_response(app)


@router.patch("/{app_id}", response_model=ApplicationResponse)
async def update_application(
    app_id: UUID,
    data: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Application).where(Application.id == app_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    if user.role == UserRole.APPLICANT and app.applicant_id != user.id:
        raise HTTPException(403, "Access denied")

    if app.status != ApplicationStatus.DRAFT:
        raise HTTPException(400, "Can only edit draft applications")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(app, field, value)

    await db.commit()

    # Reload
    result = await db.execute(
        select(Application).options(
            joinedload(Application.program),
            joinedload(Application.applicant).joinedload(User.profile),
            joinedload(Application.reviews),
            joinedload(Application.offer),
        ).where(Application.id == app_id)
    )
    app = result.unique().scalar_one()
    return build_application_response(app)


@router.post("/{app_id}/submit", response_model=ApplicationResponse)
async def submit_application(
    app_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")
    if user.role == UserRole.APPLICANT and app.applicant_id != user.id:
        raise HTTPException(403, "Access denied")
    if app.status != ApplicationStatus.DRAFT:
        raise HTTPException(400, "Application already submitted")

    app.status = ApplicationStatus.SUBMITTED
    app.submitted_at = datetime.utcnow()
    await db.commit()

    result = await db.execute(
        select(Application).options(
            joinedload(Application.program),
            joinedload(Application.applicant).joinedload(User.profile),
            joinedload(Application.reviews),
            joinedload(Application.offer),
        ).where(Application.id == app_id)
    )
    app = result.unique().scalar_one()
    return build_application_response(app)


@router.post("/{app_id}/status/{new_status}", response_model=ApplicationResponse)
async def change_status(
    app_id: UUID,
    new_status: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    try:
        app.status = ApplicationStatus(new_status)
    except ValueError:
        raise HTTPException(400, f"Invalid status: {new_status}")

    await db.commit()

    result = await db.execute(
        select(Application).options(
            joinedload(Application.program),
            joinedload(Application.applicant).joinedload(User.profile),
            joinedload(Application.reviews),
            joinedload(Application.offer),
        ).where(Application.id == app_id)
    )
    app = result.unique().scalar_one()
    return build_application_response(app)
