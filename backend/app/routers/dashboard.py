"""
Dashboard Router - Aggregated statistics and analytics
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.models import (
    Lead, LeadSource, LeadStatus,
    Application, ApplicationStatus, Program,
    Student, User, UserRole
)
from app.schemas.schemas import DashboardStats, ApplicationResponse
from app.utils.auth import require_roles
from app.routers.applications import build_application_response

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    # Lead counts
    total_leads = (await db.execute(select(func.count(Lead.id)))).scalar() or 0
    new_leads = (await db.execute(
        select(func.count(Lead.id)).where(Lead.status == LeadStatus.NEW)
    )).scalar() or 0

    # Application counts
    total_apps = (await db.execute(select(func.count(Application.id)))).scalar() or 0

    status_counts = {}
    for s in ApplicationStatus:
        count = (await db.execute(
            select(func.count(Application.id)).where(Application.status == s)
        )).scalar() or 0
        status_counts[s.value] = count

    # Students & Programs
    total_students = (await db.execute(select(func.count(Student.id)))).scalar() or 0
    total_programs = (await db.execute(
        select(func.count(Program.id)).where(Program.is_active == True)
    )).scalar() or 0

    # Leads by source
    leads_by_source = {}
    for src in LeadSource:
        count = (await db.execute(
            select(func.count(Lead.id)).where(Lead.source == src)
        )).scalar() or 0
        if count > 0:
            leads_by_source[src.value] = count

    # Applications by program
    apps_by_program = {}
    prog_result = await db.execute(select(Program).where(Program.is_active == True))
    for prog in prog_result.scalars().all():
        count = (await db.execute(
            select(func.count(Application.id)).where(Application.program_id == prog.id)
        )).scalar() or 0
        if count > 0:
            apps_by_program[prog.name] = count

    # Recent applications
    recent_result = await db.execute(
        select(Application).options(
            joinedload(Application.program),
            joinedload(Application.applicant).joinedload(User.profile),
            joinedload(Application.reviews),
            joinedload(Application.offer),
        ).order_by(Application.created_at.desc()).limit(5)
    )
    recent_apps = [
        build_application_response(a)
        for a in recent_result.unique().scalars().all()
    ]

    return DashboardStats(
        total_leads=total_leads,
        new_leads=new_leads,
        total_applications=total_apps,
        submitted_applications=status_counts.get("submitted", 0),
        under_review=status_counts.get("under_review", 0),
        offered=status_counts.get("offered", 0),
        accepted=status_counts.get("accepted", 0),
        rejected=status_counts.get("rejected", 0),
        total_students=total_students,
        total_programs=total_programs,
        leads_by_source=leads_by_source,
        applications_by_status=status_counts,
        applications_by_program=apps_by_program,
        recent_applications=recent_apps,
    )
