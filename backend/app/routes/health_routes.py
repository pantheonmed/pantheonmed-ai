"""Health records routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.health_record import HealthRecord
from app.schemas.health_schema import HealthRecordCreate, HealthRecordResponse
from app.services.auth_service import get_current_user_required
from app.models.user import User

router = APIRouter(prefix="/health-records", tags=["health-records"])


@router.get("", response_model=list[HealthRecordResponse])
async def list_health_records(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user_required),
):
    result = await db.execute(select(HealthRecord).where(HealthRecord.user_id == user.id))
    records = result.scalars().all()
    return [
        HealthRecordResponse(
            id=r.id,
            user_id=r.user_id,
            title=r.title,
            record_type=r.record_type,
            content=r.content,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in records
    ]


@router.post("", response_model=HealthRecordResponse)
async def create_health_record(
    req: HealthRecordCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user_required),
):
    record = HealthRecord(
        user_id=user.id,
        title=req.title,
        record_type=req.record_type,
        content=req.content,
        metadata_=req.metadata,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return HealthRecordResponse(
        id=record.id,
        user_id=record.user_id,
        title=record.title,
        record_type=record.record_type,
        content=record.content,
        created_at=record.created_at.isoformat() if record.created_at else "",
    )
