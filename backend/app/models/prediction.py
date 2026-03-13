import uuid
from datetime import datetime

from sqlalchemy import String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id: Mapped[str] = mapped_column(String(36), ForeignKey("calls.id"), unique=True, nullable=False)
    purchase_probability: Mapped[float] = mapped_column(Float, nullable=False)
    predicted_outcome: Mapped[str] = mapped_column(String(50), nullable=False)
    feature_importance: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    model_version: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    call = relationship("Call", back_populates="prediction")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    version: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    model_path: Mapped[str] = mapped_column(String(500), nullable=False)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    precision_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    recall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    f1_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    auc_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    metrics_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    feature_names: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=False)
    training_samples: Mapped[int | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
