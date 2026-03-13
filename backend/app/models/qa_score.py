"""Scaffold for Phase 5 - QA & Compliance."""
import uuid
from datetime import datetime

from sqlalchemy import String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class QAScore(Base):
    __tablename__ = "qa_scores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id: Mapped[str] = mapped_column(String(36), ForeignKey("calls.id"), nullable=False)
    total_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    breakdown: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    flags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    call = relationship("Call", back_populates="qa_scores")


class ComplianceRule(Base):
    __tablename__ = "compliance_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    rule_type: Mapped[str] = mapped_column(String(50), nullable=False)
    pattern: Mapped[str | None] = mapped_column(Text, nullable=True)
    points: Mapped[float] = mapped_column(Float, default=0)
    is_mandatory: Mapped[bool] = mapped_column(default=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
