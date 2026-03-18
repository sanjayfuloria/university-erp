"""
Fees Router - Fee structure, invoice generation, payments, defaulters
"""

import random
import string
from uuid import UUID
from typing import Optional
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.models import (
    FeeStructure, FeeType, FeeInvoice, FeeLineItem, FeePayment,
    PaymentStatus, Student, Program, User, UserRole, UserProfile,
    AdmissionOffer,
)
from app.schemas.schemas import (
    FeeStructureCreate, FeeStructureResponse,
    FeeInvoiceResponse, PaymentCreate, PaymentResponse,
    FeeDefaulterResponse,
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
        return None, None, None
    name = f"{s.user.profile.first_name} {s.user.profile.last_name}" if s.user and s.user.profile else None
    return name, s.roll_number, s.program.name if s.program else None


# ─── Fee Structure ───────────────────────────────────────────────────

@router.get("/structure", response_model=list[FeeStructureResponse])
async def list_fee_structures(
    program_id: Optional[UUID] = None,
    semester: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(FeeStructure).options(joinedload(FeeStructure.program)).where(FeeStructure.is_active == True)
    if program_id:
        q = q.where(FeeStructure.program_id == program_id)
    if semester:
        q = q.where(FeeStructure.semester == semester)
    q = q.order_by(FeeStructure.program_id, FeeStructure.semester, FeeStructure.fee_type)
    result = await db.execute(q)
    return [
        FeeStructureResponse(
            id=f.id, program_id=f.program_id,
            program_name=f.program.name if f.program else None,
            semester=f.semester, academic_year=f.academic_year,
            fee_type=f.fee_type.value, amount=f.amount, due_date=f.due_date,
        ) for f in result.unique().scalars().all()
    ]


@router.post("/structure", response_model=FeeStructureResponse)
async def create_fee_structure(
    data: FeeStructureCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    fs = FeeStructure(
        program_id=data.program_id, semester=data.semester,
        academic_year=data.academic_year, fee_type=FeeType(data.fee_type),
        amount=data.amount, due_date=data.due_date,
    )
    db.add(fs)
    await db.commit()
    await db.refresh(fs)
    prog = await db.execute(select(Program).where(Program.id == fs.program_id))
    p = prog.scalar_one_or_none()
    return FeeStructureResponse(
        id=fs.id, program_id=fs.program_id, program_name=p.name if p else None,
        semester=fs.semester, academic_year=fs.academic_year,
        fee_type=fs.fee_type.value, amount=fs.amount, due_date=fs.due_date,
    )


# ─── Invoice Generation ─────────────────────────────────────────────

@router.post("/generate-invoices")
async def generate_invoices(
    program_id: Optional[UUID] = None,
    semester: int = 1,
    academic_year: str = "2025-2026",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    """Generate fee invoices for all active students in a program/semester."""
    # Get fee structure
    q = select(FeeStructure).where(
        FeeStructure.semester == semester,
        FeeStructure.academic_year == academic_year,
        FeeStructure.is_active == True,
    )
    if program_id:
        q = q.where(FeeStructure.program_id == program_id)
    structures = (await db.execute(q)).scalars().all()

    if not structures:
        raise HTTPException(400, "No fee structure found. Create fee structure first.")

    # Group by program
    prog_fees: dict = {}
    for fs in structures:
        prog_fees.setdefault(fs.program_id, []).append(fs)

    generated = 0
    for pid, fees in prog_fees.items():
        students = await db.execute(
            select(Student).options(joinedload(Student.application).joinedload(AdmissionOffer))
            .where(Student.program_id == pid, Student.is_active == True, Student.current_semester == semester)
        )
        for student in students.unique().scalars().all():
            # Check if invoice already exists
            existing = await db.execute(
                select(FeeInvoice).where(
                    FeeInvoice.student_id == student.id,
                    FeeInvoice.semester == semester,
                    FeeInvoice.academic_year == academic_year,
                )
            )
            if existing.scalar_one_or_none():
                continue

            total = sum(f.amount for f in fees)
            # Check for scholarship
            scholarship = 0
            if student.application and student.application.offer:
                scholarship = student.application.offer.scholarship_percentage or 0
            discount = round(total * scholarship / 100, 2)
            net = round(total - discount, 2)

            inv_num = f"INV-{academic_year.split('-')[0]}-{''.join(random.choices(string.digits, k=6))}"
            due = fees[0].due_date or date.today()

            invoice = FeeInvoice(
                invoice_number=inv_num, student_id=student.id,
                semester=semester, academic_year=academic_year,
                total_amount=total, scholarship_discount=discount,
                net_amount=net, amount_paid=0, balance=net,
                due_date=due,
            )
            db.add(invoice)
            await db.flush()

            for f in fees:
                db.add(FeeLineItem(
                    invoice_id=invoice.id, fee_type=f.fee_type,
                    description=f"{f.fee_type.value.replace('_', ' ').title()} Fee",
                    amount=f.amount,
                ))
            generated += 1

    await db.commit()
    return {"invoices_generated": generated}


# ─── Invoices ────────────────────────────────────────────────────────

@router.get("/invoices", response_model=list[FeeInvoiceResponse])
async def list_invoices(
    student_id: Optional[UUID] = None,
    status: Optional[str] = None,
    semester: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(FeeInvoice).options(
        joinedload(FeeInvoice.line_items),
        joinedload(FeeInvoice.payments),
    )
    if student_id:
        q = q.where(FeeInvoice.student_id == student_id)
    if status:
        q = q.where(FeeInvoice.status == PaymentStatus(status))
    if semester:
        q = q.where(FeeInvoice.semester == semester)
    if user.role == UserRole.STUDENT:
        st = await db.execute(select(Student).where(Student.user_id == user.id))
        student = st.scalar_one_or_none()
        if student:
            q = q.where(FeeInvoice.student_id == student.id)

    q = q.order_by(FeeInvoice.generated_at.desc())
    result = await db.execute(q)
    invoices = result.unique().scalars().all()

    responses = []
    for inv in invoices:
        name, roll, _ = await _student_info(db, inv.student_id)
        responses.append(FeeInvoiceResponse(
            id=inv.id, invoice_number=inv.invoice_number,
            student_id=inv.student_id, student_name=name, roll_number=roll,
            semester=inv.semester, academic_year=inv.academic_year,
            total_amount=inv.total_amount, scholarship_discount=inv.scholarship_discount,
            net_amount=inv.net_amount, amount_paid=inv.amount_paid,
            balance=inv.balance, status=inv.status.value, due_date=inv.due_date,
            line_items=[{"fee_type": li.fee_type.value, "description": li.description, "amount": li.amount} for li in inv.line_items],
            payments=[{"amount": p.amount, "mode": p.payment_mode, "ref": p.transaction_ref, "receipt": p.receipt_number, "date": str(p.paid_at)} for p in inv.payments],
        ))
    return responses


# ─── Payments ────────────────────────────────────────────────────────

@router.post("/pay", response_model=PaymentResponse)
async def record_payment(
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    inv = await db.execute(select(FeeInvoice).where(FeeInvoice.id == data.invoice_id))
    invoice = inv.scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    if data.amount > invoice.balance:
        raise HTTPException(400, f"Payment {data.amount} exceeds balance {invoice.balance}")

    receipt = f"RCP-{''.join(random.choices(string.digits, k=8))}"
    payment = FeePayment(
        invoice_id=data.invoice_id, amount=data.amount,
        payment_mode=data.payment_mode, transaction_ref=data.transaction_ref,
        receipt_number=receipt, recorded_by=user.id, remarks=data.remarks,
    )
    db.add(payment)

    invoice.amount_paid = round(invoice.amount_paid + data.amount, 2)
    invoice.balance = round(invoice.net_amount - invoice.amount_paid, 2)
    if invoice.balance <= 0:
        invoice.status = PaymentStatus.COMPLETED
        invoice.balance = 0
    else:
        invoice.status = PaymentStatus.PARTIAL

    await db.commit()
    await db.refresh(payment)
    return PaymentResponse(
        id=payment.id, invoice_id=payment.invoice_id, amount=payment.amount,
        payment_mode=payment.payment_mode, transaction_ref=payment.transaction_ref,
        receipt_number=payment.receipt_number, paid_at=payment.paid_at,
        remarks=payment.remarks,
    )


# ─── Defaulters ──────────────────────────────────────────────────────

@router.get("/defaulters", response_model=list[FeeDefaulterResponse])
async def get_defaulters(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    invoices = await db.execute(
        select(FeeInvoice).where(
            FeeInvoice.balance > 0,
            FeeInvoice.due_date < date.today(),
        )
    )
    # Aggregate by student
    student_debts: dict = {}
    for inv in invoices.scalars().all():
        if inv.student_id not in student_debts:
            student_debts[inv.student_id] = {"due": 0, "paid": 0}
        student_debts[inv.student_id]["due"] += inv.net_amount
        student_debts[inv.student_id]["paid"] += inv.amount_paid

    results = []
    for sid, amounts in student_debts.items():
        name, roll, prog = await _student_info(db, sid)
        results.append(FeeDefaulterResponse(
            student_id=sid, student_name=name, roll_number=roll,
            program_name=prog,
            total_due=round(amounts["due"], 2),
            total_paid=round(amounts["paid"], 2),
            balance=round(amounts["due"] - amounts["paid"], 2),
        ))
    return sorted(results, key=lambda r: r.balance, reverse=True)
