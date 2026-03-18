"""
Leads Router - Pre-admission inquiry & lead management
"""

from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.models import Lead, LeadInteraction, Program, User, UserRole
from app.schemas.schemas import (
    LeadCreate, LeadUpdate, LeadResponse,
    LeadInteractionCreate, LeadInteractionResponse
)
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


@router.get("/", response_model=list[LeadResponse])
async def list_leads(
    status: Optional[str] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    q = select(Lead).options(joinedload(Lead.interested_program))
    if status:
        q = q.where(Lead.status == status)
    if source:
        q = q.where(Lead.source == source)
    if search:
        q = q.where(
            (Lead.first_name.ilike(f"%{search}%")) |
            (Lead.last_name.ilike(f"%{search}%")) |
            (Lead.email.ilike(f"%{search}%"))
        )
    q = q.order_by(Lead.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    leads = result.unique().scalars().all()

    return [
        LeadResponse(
            id=l.id,
            first_name=l.first_name,
            last_name=l.last_name,
            email=l.email,
            phone=l.phone,
            source=l.source.value if l.source else "other",
            status=l.status.value if l.status else "new",
            interested_program_id=l.interested_program_id,
            program_name=l.interested_program.name if l.interested_program else None,
            notes=l.notes,
            assigned_to=l.assigned_to,
            created_at=l.created_at,
            updated_at=l.updated_at,
        )
        for l in leads
    ]


@router.post("/", response_model=LeadResponse)
async def create_lead(
    data: LeadCreate,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint - anyone can submit an inquiry."""
    lead = Lead(**data.model_dump())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    prog = None
    if lead.interested_program_id:
        res = await db.execute(select(Program).where(Program.id == lead.interested_program_id))
        prog = res.scalar_one_or_none()

    return LeadResponse(
        id=lead.id,
        first_name=lead.first_name,
        last_name=lead.last_name,
        email=lead.email,
        phone=lead.phone,
        source=lead.source.value,
        status=lead.status.value,
        interested_program_id=lead.interested_program_id,
        program_name=prog.name if prog else None,
        notes=lead.notes,
        assigned_to=lead.assigned_to,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: UUID,
    data: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)

    await db.commit()
    await db.refresh(lead)

    prog = None
    if lead.interested_program_id:
        res = await db.execute(select(Program).where(Program.id == lead.interested_program_id))
        prog = res.scalar_one_or_none()

    return LeadResponse(
        id=lead.id,
        first_name=lead.first_name,
        last_name=lead.last_name,
        email=lead.email,
        phone=lead.phone,
        source=lead.source.value,
        status=lead.status.value,
        interested_program_id=lead.interested_program_id,
        program_name=prog.name if prog else None,
        notes=lead.notes,
        assigned_to=lead.assigned_to,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


@router.post("/{lead_id}/interactions", response_model=LeadInteractionResponse)
async def add_interaction(
    lead_id: UUID,
    data: LeadInteractionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Lead not found")

    interaction = LeadInteraction(
        lead_id=lead_id,
        interaction_type=data.interaction_type,
        notes=data.notes,
        performed_by=user.id,
    )
    db.add(interaction)
    await db.commit()
    await db.refresh(interaction)
    return LeadInteractionResponse.model_validate(interaction)
