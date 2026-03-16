"""Health record schemas."""
from pydantic import BaseModel
from typing import Optional


class HealthRecordCreate(BaseModel):
    title: Optional[str] = None
    record_type: Optional[str] = None
    content: Optional[str] = None
    metadata: Optional[dict] = None


class HealthRecordResponse(BaseModel):
    id: str
    user_id: str
    title: Optional[str]
    record_type: Optional[str]
    content: Optional[str]
    created_at: str

    class Config:
        from_attributes = True
