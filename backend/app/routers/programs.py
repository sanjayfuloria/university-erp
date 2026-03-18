"""
Programs Router - CRUD for academic programs
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import Program, User, UserRole
from app.schemas.schemas import ProgramCreate, ProgramResponse
from app.utils.auth import get_current_user, require_roles

router = APIRouter()


@router.get("/", response_model=list[ProgramResponse])
async def list_programs(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
):
    q = select(Program)
    if active_only:
        q = q.where(Program.is_active == True)
    q = q.order_by(Program.name)
    result = await db.execute(q)
    return [ProgramResponse.model_validate(p) for p in result.scalars().all()]


@router.post("/", response_model=ProgramResponse)
async def create_program(
    data: ProgramCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ACADEMIC_ADMIN)),
):
    prog = Program(**data.model_dump())
    db.add(prog)
    await db.commit()
    await db.refresh(prog)
    return ProgramResponse.model_validate(prog)


@router.get("/{program_id}", response_model=ProgramResponse)
async def get_program(program_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Program).where(Program.id == program_id))
    prog = result.scalar_one_or_none()
    if not prog:
        raise HTTPException(404, "Program not found")
    return ProgramResponse.model_validate(prog)
