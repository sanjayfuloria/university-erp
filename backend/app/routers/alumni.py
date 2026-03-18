"""
Alumni & Placement Router - Alumni directory, placement tracking, events
"""

from uuid import UUID
from typing import Optional
from datetime import date
import statistics

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.models import (
    AlumniRecord, PlacementCompany, PlacementOffer, PlacementStatus,
    AlumniEvent, Student, Program, User, UserRole, UserProfile,
    SemesterResult,
)
from app.schemas.schemas import (
    AlumniRecordResponse, PlacementCompanyResponse, PlacementCompanyCreate,
    PlacementOfferResponse, PlacementOfferCreate, AlumniEventResponse,
    PlacementDashboard,
)
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


async def _student_info(db, student_id):
    r = await db.execute(
        select(Student).options(
            joinedload(Student.user).joinedload(User.profile),
            joinedload(Student.program),
        ).where(Student.id == student_id)
    )
    s = r.unique().scalar_one_or_none()
    if not s:
        return None, None, None, None, None
    name = f"{s.user.profile.first_name} {s.user.profile.last_name}" if s.user and s.user.profile else None
    return name, s.roll_number, s.program.name if s.program else None, s.user.email if s.user else None, s.user_id


# ─── Alumni Directory ────────────────────────────────────────────────

@router.get("/alumni", response_model=list[AlumniRecordResponse])
async def list_alumni(
    graduation_year: Optional[int] = None,
    program_id: Optional[UUID] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(AlumniRecord).options(
        joinedload(AlumniRecord.student).joinedload(Student.user).joinedload(User.profile),
        joinedload(AlumniRecord.program),
    )
    if graduation_year:
        q = q.where(AlumniRecord.graduation_year == graduation_year)
    if program_id:
        q = q.where(AlumniRecord.program_id == program_id)
    q = q.order_by(AlumniRecord.graduation_year.desc())

    result = await db.execute(q)
    alumni = result.unique().scalars().all()

    responses = []
    for a in alumni:
        name = f"{a.student.user.profile.first_name} {a.student.user.profile.last_name}" if a.student and a.student.user and a.student.user.profile else None
        if search and name and search.lower() not in name.lower():
            continue
        responses.append(AlumniRecordResponse(
            id=a.id, student_id=a.student_id, user_id=a.user_id,
            name=name, email=a.user.email if a.user else None,
            roll_number=a.student.roll_number if a.student else None,
            program_name=a.program.name if a.program else None,
            graduation_year=a.graduation_year, final_cgpa=a.final_cgpa,
            current_company=a.current_company, current_designation=a.current_designation,
            current_city=a.current_city, linkedin_url=a.linkedin_url,
            is_mentor=a.is_mentor,
        ))
    return responses


# ─── Placement Companies ─────────────────────────────────────────────

@router.get("/companies", response_model=list[PlacementCompanyResponse])
async def list_companies(
    academic_year: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(PlacementCompany).where(PlacementCompany.is_active == True)
    if academic_year:
        q = q.where(PlacementCompany.academic_year == academic_year)
    q = q.order_by(PlacementCompany.visit_date.desc().nullslast())
    result = await db.execute(q)
    return [PlacementCompanyResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/companies", response_model=PlacementCompanyResponse)
async def create_company(
    data: PlacementCompanyCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    company = PlacementCompany(**data.model_dump())
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return PlacementCompanyResponse.model_validate(company)


# ─── Placement Offers ────────────────────────────────────────────────

@router.get("/offers", response_model=list[PlacementOfferResponse])
async def list_offers(
    company_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(PlacementOffer).options(
        joinedload(PlacementOffer.student).joinedload(Student.user).joinedload(User.profile),
        joinedload(PlacementOffer.company),
    )
    if company_id:
        q = q.where(PlacementOffer.company_id == company_id)
    q = q.order_by(PlacementOffer.package_lpa.desc())
    result = await db.execute(q)
    offers = result.unique().scalars().all()

    return [
        PlacementOfferResponse(
            id=o.id, student_id=o.student_id,
            student_name=f"{o.student.user.profile.first_name} {o.student.user.profile.last_name}" if o.student and o.student.user and o.student.user.profile else None,
            roll_number=o.student.roll_number if o.student else None,
            company_name=o.company.name if o.company else None,
            role=o.role, package_lpa=o.package_lpa, offer_date=o.offer_date,
            is_accepted=o.is_accepted,
            placement_status=o.placement_status.value if o.placement_status else "placed",
        ) for o in offers
    ]


@router.post("/offers", response_model=PlacementOfferResponse)
async def create_offer(
    data: PlacementOfferCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    offer = PlacementOffer(**data.model_dump())
    db.add(offer)

    # Update company stats
    comp = await db.execute(select(PlacementCompany).where(PlacementCompany.id == data.company_id))
    company = comp.scalar_one_or_none()
    if company:
        company.students_selected = (company.students_selected or 0) + 1

    await db.commit()
    await db.refresh(offer)

    name, roll, _, _, _ = await _student_info(db, offer.student_id)
    return PlacementOfferResponse(
        id=offer.id, student_id=offer.student_id,
        student_name=name, roll_number=roll,
        company_name=company.name if company else None,
        role=offer.role, package_lpa=offer.package_lpa,
        offer_date=offer.offer_date, is_accepted=offer.is_accepted,
        placement_status=offer.placement_status.value,
    )


# ─── Alumni Events ──────────────────────────────────────────────────

@router.get("/events", response_model=list[AlumniEventResponse])
async def list_events(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(AlumniEvent).order_by(AlumniEvent.event_date.desc().nullslast()))
    return [AlumniEventResponse.model_validate(e) for e in result.scalars().all()]


# ─── Placement Dashboard ─────────────────────────────────────────────

@router.get("/placement-dashboard", response_model=PlacementDashboard)
async def placement_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total_students = (await db.execute(select(func.count(Student.id)).where(Student.is_active == True))).scalar() or 0
    total_companies = (await db.execute(select(func.count(PlacementCompany.id)).where(PlacementCompany.is_active == True))).scalar() or 0

    offers = await db.execute(select(PlacementOffer))
    all_offers = offers.scalars().all()
    placed_ids = set(o.student_id for o in all_offers if o.placement_status == PlacementStatus.PLACED)

    packages = [o.package_lpa for o in all_offers if o.package_lpa]
    highest = max(packages) if packages else 0
    avg_pkg = statistics.mean(packages) if packages else 0
    median_pkg = statistics.median(packages) if packages else 0
    pct = round((len(placed_ids) / total_students * 100) if total_students > 0 else 0, 1)

    # By company
    company_stats = {}
    for o in all_offers:
        cid = o.company_id
        if cid not in company_stats:
            comp = await db.execute(select(PlacementCompany).where(PlacementCompany.id == cid))
            c = comp.scalar_one_or_none()
            company_stats[cid] = {"name": c.name if c else "Unknown", "offers": 0, "avg_pkg": []}
        company_stats[cid]["offers"] += 1
        if o.package_lpa:
            company_stats[cid]["avg_pkg"].append(o.package_lpa)

    by_company = [
        {"name": v["name"], "offers": v["offers"], "avg_package": round(statistics.mean(v["avg_pkg"]), 2) if v["avg_pkg"] else 0}
        for v in company_stats.values()
    ]

    # By program
    prog_stats: dict = {}
    for o in all_offers:
        name, roll, prog_name, _, _ = await _student_info(db, o.student_id)
        if prog_name:
            if prog_name not in prog_stats:
                prog_stats[prog_name] = {"placed": 0, "packages": []}
            prog_stats[prog_name]["placed"] += 1
            if o.package_lpa:
                prog_stats[prog_name]["packages"].append(o.package_lpa)

    by_program = [
        {"program": k, "placed": v["placed"], "avg_package": round(statistics.mean(v["packages"]), 2) if v["packages"] else 0}
        for k, v in prog_stats.items()
    ]

    return PlacementDashboard(
        total_eligible=total_students, total_placed=len(placed_ids),
        total_offers=len(all_offers), placement_percentage=pct,
        highest_package_lpa=round(highest, 2), average_package_lpa=round(avg_pkg, 2),
        median_package_lpa=round(median_pkg, 2), companies_visited=total_companies,
        by_company=sorted(by_company, key=lambda x: x["offers"], reverse=True),
        by_program=sorted(by_program, key=lambda x: x["placed"], reverse=True),
    )
