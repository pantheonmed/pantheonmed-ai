from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class HealthRecordCreate(BaseModel):
    title: str
    record_type: str = "other"
    description: Optional[str] = None
    recorded_date: Optional[date] = None

class HealthRecordResponse(BaseModel):
    id: str
    user_id: str
    title: str
    record_type: str
    description: Optional[str] = None
    ai_summary: Optional[str] = None
    recorded_date: Optional[date] = None
    created_at: datetime
    model_config = {"from_attributes": True}
