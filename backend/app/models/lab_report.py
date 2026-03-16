"""Lab report model."""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
import uuid

from app.db.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class LabReport(Base):
    __tablename__ = "lab_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    raw_text = Column(Text, nullable=True)
    analysis = Column(Text, nullable=True)
    abnormal_flags = Column(JSON, nullable=True)  # list of strings
    urgent_flags = Column(JSON, nullable=True)
    summary = Column(Text, nullable=True)
    file_path = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
