from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

class UserDetailResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    is_verified: bool
    phone: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}
