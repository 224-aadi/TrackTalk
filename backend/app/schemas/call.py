from datetime import datetime
from pydantic import BaseModel


class CallCreate(BaseModel):
    agent_id: str | None = None
    call_date: datetime | None = None
    outcome: str = "pending"
    metadata_json: dict | None = None


class CallUpdate(BaseModel):
    agent_id: str | None = None
    outcome: str | None = None
    call_date: datetime | None = None
    metadata_json: dict | None = None


class CallResponse(BaseModel):
    id: str
    agent_id: str | None
    audio_file_path: str
    original_filename: str
    duration_seconds: float | None
    call_date: datetime | None
    outcome: str
    status: str
    metadata_json: dict | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CallWithDetails(CallResponse):
    transcript: "TranscriptResponse | None" = None
    analysis: "AnalysisResponse | None" = None
    prediction: "PredictionResponse | None" = None


class CallListResponse(BaseModel):
    calls: list[CallResponse]
    total: int
    page: int
    page_size: int


class TranscriptResponse(BaseModel):
    id: str
    full_text: str
    segments: dict | None
    language: str | None
    confidence: float | None
    word_count: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisResponse(BaseModel):
    id: str
    sentiment_score: float | None
    sentiment_label: str | None
    keywords: dict | None
    topics: dict | None
    entities: dict | None
    features: dict | None
    created_at: datetime

    class Config:
        from_attributes = True


class PredictionResponse(BaseModel):
    id: str
    purchase_probability: float
    predicted_outcome: str
    feature_importance: dict | None
    model_version: str
    created_at: datetime

    class Config:
        from_attributes = True


CallWithDetails.model_rebuild()
