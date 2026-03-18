"""
Analytics Router - Cross-module analytics and reporting
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import (
    Lead, LeadStatus, Application, ApplicationStatus, Student,
    CourseGrade, SemesterResult, AttendanceRecord, AttendanceStatus,
    FeeInvoice, PaymentStatus, CourseOffering, TimetableSlot,
    User, UserRole, Publication, PlacementOffer, PlacementStatus,
)
from app.schemas.schemas import ERPAnalytics
from app.utils.auth import require_roles

router = APIRouter()


@router.get("/comprehensive", response_model=ERPAnalytics)
async def get_comprehensive_analytics(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    # ── Admissions Funnel ─────────────────────────────────
    total_leads = (await db.execute(select(func.count(Lead.id)))).scalar() or 0
    converted_leads = (await db.execute(
        select(func.count(Lead.id)).where(Lead.status == LeadStatus.CONVERTED)
    )).scalar() or 0

    funnel = {}
    for status in ApplicationStatus:
        count = (await db.execute(
            select(func.count(Application.id)).where(Application.status == status)
        )).scalar() or 0
        funnel[status.value] = count

    total_apps = sum(funnel.values())
    accepted = funnel.get("accepted", 0)
    conversion = round((accepted / total_leads * 100) if total_leads > 0 else 0, 1)

    # ── Academic Analytics ─────────────────────────────────
    sgpa_result = await db.execute(select(func.avg(SemesterResult.sgpa)))
    avg_sgpa = round(sgpa_result.scalar() or 0, 2)

    # Program-wise SGPA
    from app.models.models import Program
    programs = (await db.execute(select(Program).where(Program.is_active == True))).scalars().all()
    program_sgpa = []
    for prog in programs:
        students = await db.execute(select(Student.id).where(Student.program_id == prog.id))
        sids = [s[0] for s in students.all()]
        if sids:
            avg_r = await db.execute(
                select(func.avg(SemesterResult.sgpa)).where(SemesterResult.student_id.in_(sids))
            )
            avg = avg_r.scalar()
            if avg:
                program_sgpa.append({"program": prog.name, "code": prog.code, "avg_sgpa": round(avg, 2)})

    # Attendance average
    total_att = (await db.execute(select(func.count(AttendanceRecord.id)))).scalar() or 0
    present_att = (await db.execute(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE])
        )
    )).scalar() or 0
    attendance_avg = round((present_att / total_att * 100) if total_att > 0 else 0, 1)

    # ── Fee Analytics ──────────────────────────────────────
    total_billed = (await db.execute(select(func.sum(FeeInvoice.net_amount)))).scalar() or 0
    total_collected = (await db.execute(select(func.sum(FeeInvoice.amount_paid)))).scalar() or 0
    outstanding = round(total_billed - total_collected, 2)
    collection_rate = round((total_collected / total_billed * 100) if total_billed > 0 else 0, 1)

    # ── Faculty Analytics ──────────────────────────────────
    total_faculty = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.FACULTY, User.is_active == True)
    )).scalar() or 0

    total_slots = (await db.execute(select(func.count(TimetableSlot.id)))).scalar() or 0
    avg_workload = round(total_slots / total_faculty, 1) if total_faculty > 0 else 0
    total_pubs = (await db.execute(select(func.count(Publication.id)))).scalar() or 0

    # ── Placement Analytics ────────────────────────────────
    total_students = (await db.execute(select(func.count(Student.id)).where(Student.is_active == True))).scalar() or 0
    placed_offers = await db.execute(select(PlacementOffer).where(PlacementOffer.placement_status == PlacementStatus.PLACED))
    placed = placed_offers.scalars().all()
    placed_ids = set(o.student_id for o in placed)
    placement_rate = round((len(placed_ids) / total_students * 100) if total_students > 0 else 0, 1)
    packages = [o.package_lpa for o in placed if o.package_lpa]
    avg_package = round(sum(packages) / len(packages), 2) if packages else 0

    # ── Monthly Application Trend ──────────────────────────
    monthly = []
    for month in range(1, 13):
        count = (await db.execute(
            select(func.count(Application.id)).where(
                extract('month', Application.created_at) == month
            )
        )).scalar() or 0
        if count > 0:
            month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            monthly.append({"month": month_names[month - 1], "count": count})

    # ── Lead Conversion Funnel ─────────────────────────────
    lead_funnel = []
    for status in [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.INTERESTED, LeadStatus.APPLICATION_SENT, LeadStatus.CONVERTED]:
        count = (await db.execute(
            select(func.count(Lead.id)).where(Lead.status == status)
        )).scalar() or 0
        lead_funnel.append({"stage": status.value.replace("_", " ").title(), "count": count})

    return ERPAnalytics(
        admissions_funnel=funnel,
        conversion_rate=conversion,
        avg_sgpa=avg_sgpa,
        program_wise_sgpa=sorted(program_sgpa, key=lambda x: x["avg_sgpa"], reverse=True),
        attendance_avg=attendance_avg,
        fee_collection_rate=collection_rate,
        total_revenue=round(total_collected, 2),
        outstanding_amount=outstanding,
        total_faculty=total_faculty,
        avg_workload_hours=avg_workload,
        total_publications=total_pubs,
        placement_rate=placement_rate,
        avg_package_lpa=avg_package,
        monthly_applications=monthly,
        lead_conversion_funnel=lead_funnel,
    )
