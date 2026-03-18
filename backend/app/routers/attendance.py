"""
Attendance Router - Mark and view attendance with summaries
"""

from uuid import UUID
from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.models import (
    AttendanceRecord, AttendanceStatus, CourseOffering, CourseRegistration,
    Student, User, UserRole, UserProfile
)
from app.schemas.schemas import (
    AttendanceMarkRequest, AttendanceRecordResponse, AttendanceSummary
)
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


@router.post("/mark", response_model=list[AttendanceRecordResponse])
async def mark_attendance(
    data: AttendanceMarkRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN, UserRole.FACULTY)),
):
    """Bulk mark attendance for a class session."""
    records = []
    for entry in data.entries:
        student_id = UUID(entry["student_id"])
        status = AttendanceStatus(entry.get("status", "present"))
        remarks = entry.get("remarks")

        # Upsert: check if already marked
        existing = await db.execute(
            select(AttendanceRecord).where(
                AttendanceRecord.offering_id == data.offering_id,
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.date == data.date,
            )
        )
        record = existing.scalar_one_or_none()
        if record:
            record.status = status
            record.remarks = remarks
            record.marked_by = user.id
        else:
            record = AttendanceRecord(
                offering_id=data.offering_id,
                student_id=student_id,
                date=data.date,
                status=status,
                marked_by=user.id,
                remarks=remarks,
            )
            db.add(record)
        records.append(record)

    await db.commit()

    # Reload with student info
    result_records = []
    for r in records:
        await db.refresh(r)
        st = await db.execute(
            select(Student).options(joinedload(Student.user).joinedload(User.profile))
            .where(Student.id == r.student_id)
        )
        student = st.unique().scalar_one_or_none()
        result_records.append(AttendanceRecordResponse(
            id=r.id, offering_id=r.offering_id, student_id=r.student_id,
            student_name=f"{student.user.profile.first_name} {student.user.profile.last_name}" if student and student.user and student.user.profile else None,
            roll_number=student.roll_number if student else None,
            date=r.date, status=r.status.value, remarks=r.remarks,
        ))

    return result_records


@router.get("/offering/{offering_id}", response_model=list[AttendanceRecordResponse])
async def get_attendance_by_date(
    offering_id: UUID,
    attendance_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = (
        select(AttendanceRecord)
        .options(
            joinedload(AttendanceRecord.student)
            .joinedload(Student.user)
            .joinedload(User.profile),
        )
        .where(AttendanceRecord.offering_id == offering_id)
    )
    if attendance_date:
        q = q.where(AttendanceRecord.date == attendance_date)
    q = q.order_by(AttendanceRecord.date.desc())

    result = await db.execute(q)
    records = result.unique().scalars().all()

    return [
        AttendanceRecordResponse(
            id=r.id, offering_id=r.offering_id, student_id=r.student_id,
            student_name=f"{r.student.user.profile.first_name} {r.student.user.profile.last_name}" if r.student and r.student.user and r.student.user.profile else None,
            roll_number=r.student.roll_number if r.student else None,
            date=r.date, status=r.status.value, remarks=r.remarks,
        ) for r in records
    ]


@router.get("/summary/{offering_id}", response_model=list[AttendanceSummary])
async def get_attendance_summary(
    offering_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Per-student attendance summary for a course offering."""
    # Get registered students
    regs = await db.execute(
        select(CourseRegistration)
        .options(joinedload(CourseRegistration.student).joinedload(Student.user).joinedload(User.profile))
        .where(CourseRegistration.offering_id == offering_id, CourseRegistration.is_dropped == False)
    )
    students = [(r.student_id, r.student) for r in regs.unique().scalars().all()]

    summaries = []
    for student_id, student in students:
        # Count by status
        counts = {}
        for status in AttendanceStatus:
            count_result = await db.execute(
                select(func.count(AttendanceRecord.id)).where(
                    AttendanceRecord.offering_id == offering_id,
                    AttendanceRecord.student_id == student_id,
                    AttendanceRecord.status == status,
                )
            )
            counts[status.value] = count_result.scalar() or 0

        total = sum(counts.values())
        present_equiv = counts.get("present", 0) + counts.get("late", 0) + counts.get("excused", 0)
        pct = round((present_equiv / total * 100) if total > 0 else 0, 1)

        summaries.append(AttendanceSummary(
            student_id=student_id,
            student_name=f"{student.user.profile.first_name} {student.user.profile.last_name}" if student and student.user and student.user.profile else None,
            roll_number=student.roll_number if student else None,
            total_classes=total,
            present=counts.get("present", 0),
            absent=counts.get("absent", 0),
            late=counts.get("late", 0),
            excused=counts.get("excused", 0),
            percentage=pct,
        ))

    return sorted(summaries, key=lambda s: s.roll_number or "")
