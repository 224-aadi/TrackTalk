import uuid
from datetime import datetime

from sqlalchemy import String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id: Mapped[str] = mapped_column(String(36), ForeignKey("calls.id"), unique=True, nullable=False)
    sentiment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    sentiment_label: Mapped[str | None] = mapped_column(String(50), nullable=True)
    keywords: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    topics: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    entities: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    features: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    call = relationship("Call", back_populates="analysis_result")
