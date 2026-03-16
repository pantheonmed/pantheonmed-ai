"""Auth routes: register, login, me."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.schemas.auth_schema import LoginRequest, RegisterRequest, AuthResponse, UserProfile
from app.services.auth_service import (
    get_user_by_email,
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user_required,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserProfile)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_email(db, req.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role=req.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserProfile(id=user.id, email=user.email, full_name=user.full_name, role=user.role)


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, req.email)
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access = create_access_token({"sub": user.id, "role": user.role})
    refresh = create_refresh_token({"sub": user.id})
    return AuthResponse(
        access_token=access,
        refresh_token=refresh,
        token_type="bearer",
        role=user.role,
    )


@router.get("/me", response_model=UserProfile)
async def me(user: User = Depends(get_current_user_required)):
    return UserProfile(id=user.id, email=user.email, full_name=user.full_name, role=user.role)
