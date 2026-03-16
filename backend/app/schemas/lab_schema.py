"""Lab analysis request/response schemas."""
from pydantic import BaseModel
from typing import Optional


class LabAnalyzeRequest(BaseModel):
    raw_text: str
    lab_name: Optional[str] = None
    patient_context: Optional[str] = None


class LabPattern(BaseModel):
    name: str
    confidence: float
    message: str
    suggested_tests: list[str] = []


class LabAnalyzeResponse(BaseModel):
    report_id: str
    analysis: str
    abnormal_flags: list[str]
    urgent_flags: list[str]
    summary: str
    patterns: Optional[list[LabPattern]] = None
    parsed_tests_count: Optional[int] = None
