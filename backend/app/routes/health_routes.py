from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.user import User
from app.models.health_record import HealthRecord
from app.schemas.health_schema import HealthRecordCreate, HealthRecordResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/health-records", tags=["Health Records"])

@router.post("", response_model=HealthRecordResponse, status_code=201)
async def create_record(body: HealthRecordCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    record = HealthRecord(user_id=current_user.id, title=body.title, record_type=body.record_type, description=body.description, recorded_date=body.recorded_date)
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record

@router.get("", response_model=list[HealthRecordResponse])
async def list_records(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HealthRecord).where(HealthRecord.user_id == current_user.id).order_by(HealthRecord.created_at.desc()))
    return result.scalars().all()

@router.delete("/{record_id}", status_code=204)
async def delete_record(record_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HealthRecord).where(HealthRecord.id == record_id, HealthRecord.user_id == current_user.id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Record not found")
    await db.delete(record)
    await db.commit()
