from datetime import datetime
from pydantic import BaseModel


class TrainRequest(BaseModel):
    test_size: float = 0.2
    model_type: str = "xgboost"


class TrainResponse(BaseModel):
    model_version: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    auc: float
    training_samples: int
    test_samples: int
    feature_names: list[str]


class PredictResponse(BaseModel):
    call_id: str
    purchase_probability: float
    predicted_outcome: str
    feature_importance: list[dict]
    model_version: str


class BatchPredictResponse(BaseModel):
    predicted: int
    skipped: int
    errors: int


class ModelVersionResponse(BaseModel):
    id: str
    version: str
    accuracy: float | None
    precision_score: float | None
    recall_score: float | None
    f1_score: float | None
    auc_score: float | None
    is_active: bool
    training_samples: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class ModelMetricsDetail(BaseModel):
    version: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    auc: float
    confusion_matrix: list[list[int]]
    roc_curve: dict
    feature_importance: list[dict]
