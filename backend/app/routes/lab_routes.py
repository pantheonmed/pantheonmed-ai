"""Lab analysis routes."""
from fastapi import APIRouter, Depends

from app.schemas.lab_schema import LabAnalyzeRequest, LabAnalyzeResponse
from app.services.lab_analyzer import analyze_lab_text

router = APIRouter(prefix="/lab", tags=["lab"])


@router.post("/analyze", response_model=LabAnalyzeResponse)
async def analyze_lab(req: LabAnalyzeRequest):
    result = await analyze_lab_text(
        raw_text=req.raw_text,
        lab_name=req.lab_name,
        patient_context=req.patient_context,
    )
    return LabAnalyzeResponse(**result)
