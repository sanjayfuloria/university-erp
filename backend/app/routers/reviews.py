"""
Reviews Router - Application evaluation and offer management
"""

from uuid import UUID
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.models import (
    Application, ApplicationReview, AdmissionOffer,
    ApplicationStatus, User, UserRole
)
from app.schemas.schemas import (
    ReviewCreate, ReviewResponse, OfferCreate, OfferResponse
)
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


@router.post("/{app_id}/review", response_model=ReviewResponse)
async def submit_review(
    app_id: UUID,
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN, UserRole.FACULTY)),
):
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    # Calculate weighted overall score
    overall = (
        data.academic_score * 0.3 +
        data.entrance_score * 0.25 +
        data.sop_score * 0.2 +
        data.interview_score * 0.25
    )

    review = ApplicationReview(
        application_id=app_id,
        reviewer_id=user.id,
        academic_score=data.academic_score,
        entrance_score=data.entrance_score,
        sop_score=data.sop_score,
        interview_score=data.interview_score,
        overall_score=round(overall, 2),
        recommendation=data.recommendation,
        comments=data.comments,
    )
    db.add(review)

    # Auto-update application status
    if app.status == ApplicationStatus.SUBMITTED:
        app.status = ApplicationStatus.UNDER_REVIEW

    await db.commit()
    await db.refresh(review)
    return ReviewResponse.model_validate(review)


@router.post("/{app_id}/offer", response_model=OfferResponse)
async def make_offer(
    app_id: UUID,
    data: OfferCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    result = await db.execute(
        select(Application).options(joinedload(Application.offer))
        .where(Application.id == app_id)
    )
    app = result.unique().scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")
    if app.offer:
        raise HTTPException(400, "Offer already exists for this application")

    offer = AdmissionOffer(
        application_id=app_id,
        response_deadline=data.response_deadline,
        scholarship_percentage=data.scholarship_percentage,
        fee_amount=data.fee_amount,
        remarks=data.remarks,
    )
    db.add(offer)
    app.status = ApplicationStatus.OFFERED
    await db.commit()
    await db.refresh(offer)
    return OfferResponse.model_validate(offer)


@router.post("/{app_id}/offer/accept", response_model=OfferResponse)
async def accept_offer(
    app_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Application).options(joinedload(Application.offer))
        .where(Application.id == app_id)
    )
    app = result.unique().scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")
    if not app.offer:
        raise HTTPException(400, "No offer found")

    if user.role == UserRole.APPLICANT and app.applicant_id != user.id:
        raise HTTPException(403, "Access denied")

    from datetime import datetime
    app.offer.is_accepted = True
    app.offer.accepted_at = datetime.utcnow()
    app.status = ApplicationStatus.ACCEPTED
    await db.commit()
    await db.refresh(app.offer)
    return OfferResponse.model_validate(app.offer)
