import uuid
from datetime import datetime, timezone, date
from sqlalchemy import String, DateTime, Text, ForeignKey, Boolean, Integer, Date, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.database import Base
import enum

class RecordType(str, enum.Enum):
    lab = "lab"
    radiology = "radiology"
    prescription = "prescription"
    discharge = "discharge"
    vaccination = "vaccination"
    vitals = "vitals"
    other = "other"

class HealthRecord(Base):
    __tablename__ = "health_records"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    record_type: Mapped[RecordType] = mapped_column(SAEnum(RecordType), default=RecordType.other)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ocr_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    tags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
