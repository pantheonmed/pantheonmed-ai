import uuid
from fastapi import APIRouter, HTTPException
from app.schemas.lab_schema import LabAnalyzeTextRequest, LabAnalyzeResponse

router = APIRouter(prefix="/lab", tags=["Lab Reports"])

@router.post("/analyze", response_model=LabAnalyzeResponse)
async def analyze_lab(body: LabAnalyzeTextRequest):
    """No database — returns mock response."""
    if not body.raw_text.strip():
        raise HTTPException(400, "Lab report text cannot be empty")

    return LabAnalyzeResponse(
        report_id=str(uuid.uuid4()),
        analysis="Lab analysis working ✅ — Report received. (Database disabled — connect DB for full AI analysis.)",
        abnormal_flags=[],
        urgent_flags=[],
        summary="Mock summary — database not connected.",
    )
