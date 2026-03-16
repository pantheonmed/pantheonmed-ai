"""Auth request/response schemas."""
from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "patient"


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str

    class Config:
        from_attributes = True
