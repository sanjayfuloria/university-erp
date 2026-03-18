"""
Timetable Router - Weekly schedule management
"""

from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.models import (
    TimetableSlot, CourseOffering, Course, CourseRegistration,
    Student, User, UserRole, UserProfile, DayOfWeek
)
from app.schemas.schemas import TimetableSlotCreate, TimetableSlotResponse
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


def build_slot_response(slot: TimetableSlot) -> TimetableSlotResponse:
    o = slot.offering
    return TimetableSlotResponse(
        id=slot.id, offering_id=slot.offering_id,
        course_code=o.course.code if o and o.course else None,
        course_name=o.course.name if o and o.course else None,
        faculty_name=f"{o.faculty.profile.first_name} {o.faculty.profile.last_name}" if o and o.faculty and o.faculty.profile else None,
        section=o.section if o else None,
        day_of_week=slot.day_of_week.value if slot.day_of_week else "",
        start_time=slot.start_time, end_time=slot.end_time,
        room_number=slot.room_number,
    )


@router.get("/", response_model=list[TimetableSlotResponse])
async def get_timetable(
    program_id: Optional[UUID] = None,
    semester: Optional[int] = None,
    faculty_id: Optional[UUID] = None,
    student_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = (
        select(TimetableSlot)
        .options(
            joinedload(TimetableSlot.offering)
            .joinedload(CourseOffering.course)
            .joinedload(Course.program),
            joinedload(TimetableSlot.offering)
            .joinedload(CourseOffering.faculty)
            .joinedload(User.profile),
        )
    )

    if student_id:
        # Get timetable for a specific student based on their registrations
        reg_q = select(CourseRegistration.offering_id).where(
            CourseRegistration.student_id == student_id,
            CourseRegistration.is_dropped == False,
        )
        reg_result = await db.execute(reg_q)
        offering_ids = [r[0] for r in reg_result.all()]
        if not offering_ids:
            return []
        q = q.where(TimetableSlot.offering_id.in_(offering_ids))
    else:
        if faculty_id:
            q = q.join(CourseOffering).where(CourseOffering.faculty_id == faculty_id)
        if program_id or semester:
            if not faculty_id:
                q = q.join(CourseOffering)
            q = q.join(Course)
            if program_id:
                q = q.where(Course.program_id == program_id)
            if semester:
                q = q.where(CourseOffering.semester == semester)

    result = await db.execute(q)
    slots = result.unique().scalars().all()

    # Sort by day order then time
    day_order = {d.value: i for i, d in enumerate(DayOfWeek)}
    slots_sorted = sorted(slots, key=lambda s: (
        day_order.get(s.day_of_week.value if s.day_of_week else "", 99),
        s.start_time
    ))

    return [build_slot_response(s) for s in slots_sorted]


@router.post("/", response_model=TimetableSlotResponse)
async def create_slot(
    data: TimetableSlotCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    slot = TimetableSlot(
        offering_id=data.offering_id,
        day_of_week=DayOfWeek(data.day_of_week),
        start_time=data.start_time,
        end_time=data.end_time,
        room_number=data.room_number,
    )
    db.add(slot)
    await db.commit()

    result = await db.execute(
        select(TimetableSlot)
        .options(
            joinedload(TimetableSlot.offering)
            .joinedload(CourseOffering.course),
            joinedload(TimetableSlot.offering)
            .joinedload(CourseOffering.faculty)
            .joinedload(User.profile),
        )
        .where(TimetableSlot.id == slot.id)
    )
    slot = result.unique().scalar_one()
    return build_slot_response(slot)


@router.delete("/{slot_id}")
async def delete_slot(
    slot_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    result = await db.execute(select(TimetableSlot).where(TimetableSlot.id == slot_id))
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(404, "Slot not found")
    await db.delete(slot)
    await db.commit()
    return {"deleted": True}
