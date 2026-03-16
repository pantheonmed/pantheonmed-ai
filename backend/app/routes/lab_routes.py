from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.user import User
from app.models.lab_report import LabReport
from app.schemas.lab_schema import LabAnalyzeTextRequest, LabAnalyzeResponse
from app.services.auth_service import get_current_user
from app.services.lab_analyzer import analyze_lab_text

router = APIRouter(prefix="/lab", tags=["Lab Reports"])

@router.post("/analyze", response_model=LabAnalyzeResponse)
async def analyze_lab(body: LabAnalyzeTextRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not body.raw_text.strip():
        raise HTTPException(400, "Lab report text cannot be empty")
    result = await analyze_lab_text(raw_text=body.raw_text, patient_context=body.patient_context or "", lab_name=body.lab_name or "")
    report = LabReport(user_id=current_user.id, raw_text=body.raw_text, ai_analysis=result["analysis"], lab_name=body.lab_name, report_date=body.report_date)
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return LabAnalyzeResponse(report_id=report.id, analysis=result["analysis"], abnormal_flags=result["abnormal_flags"], urgent_flags=result["urgent_flags"], summary=result["summary"])

@router.get("/reports")
async def list_reports(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LabReport).where(LabReport.user_id == current_user.id).order_by(LabReport.created_at.desc()).limit(50))
    return result.scalars().all()
