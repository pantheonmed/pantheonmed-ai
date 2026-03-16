"""User schemas."""
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: str = "patient"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str

    class Config:
        from_attributes = True
