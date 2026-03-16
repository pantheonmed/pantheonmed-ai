from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime, date

class LabAnalyzeTextRequest(BaseModel):
    raw_text: str
    lab_name: Optional[str] = None
    report_date: Optional[date] = None
    patient_context: Optional[str] = None

class LabAnalyzeResponse(BaseModel):
    report_id: str
    analysis: str
    abnormal_flags: list[str] = []
    urgent_flags: list[str] = []
    summary: str
