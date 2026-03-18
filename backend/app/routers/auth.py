"""
Authentication Router - Login, Register, Profile
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.models import User, UserProfile, UserRole
from app.schemas.schemas import (
    LoginRequest, LoginResponse, RegisterRequest, UserResponse
)
from app.utils.auth import (
    hash_password, verify_password, create_access_token, get_current_user
)

router = APIRouter()


@router.post("/register", response_model=UserResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check existing
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=UserRole(req.role.value),
    )
    db.add(user)
    await db.flush()

    profile = UserProfile(
        user_id=user.id,
        first_name=req.first_name,
        last_name=req.last_name,
        phone=req.phone,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role.value,
        is_active=user.is_active,
        first_name=req.first_name,
        last_name=req.last_name,
    )


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(joinedload(User.profile)).where(User.email == req.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")

    token = create_access_token({"sub": str(user.id), "role": user.role.value})

    return LoginResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            role=user.role.value,
            is_active=user.is_active,
            first_name=user.profile.first_name if user.profile else None,
            last_name=user.profile.last_name if user.profile else None,
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role.value,
        is_active=user.is_active,
        first_name=user.profile.first_name if user.profile else None,
        last_name=user.profile.last_name if user.profile else None,
    )
