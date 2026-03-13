from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import numpy as np
import pandas as pd

from app.core.database import get_db
from app.models.call import Call
from app.models.analysis_result import AnalysisResult
from app.models.prediction import Prediction, ModelVersion
from app.schemas.prediction import (
    TrainRequest, TrainResponse, PredictResponse,
    BatchPredictResponse, ModelVersionResponse, ModelMetricsDetail,
)
from app.services.prediction import prediction_service
from app.services.feature_engineering import get_feature_names

router = APIRouter()


@router.post("/train", response_model=TrainResponse)
def train_model(request: TrainRequest, db: Session = Depends(get_db)):
    """Train a new prediction model on labeled calls."""
    calls = (
        db.query(Call, AnalysisResult)
        .join(AnalysisResult, Call.id == AnalysisResult.call_id)
        .filter(Call.outcome.in_(["purchase", "no_purchase"]))
        .filter(AnalysisResult.features.isnot(None))
        .all()
    )

    if len(calls) < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 10 labeled calls to train. Currently have {len(calls)}."
        )

    feature_names = get_feature_names()
    rows = []
    labels = []
    for call, analysis in calls:
        row = [analysis.features.get(fn, 0) for fn in feature_names]
        rows.append(row)
        labels.append(1 if call.outcome == "purchase" else 0)

    df = pd.DataFrame(rows, columns=feature_names)
    labels_arr = np.array(labels)

    if len(set(labels)) < 2:
        raise HTTPException(status_code=400, detail="Need both purchase and no_purchase examples to train.")

    result = prediction_service.train(df, labels_arr, test_size=request.test_size)

    db.query(ModelVersion).update({"is_active": False})

    model_ver = ModelVersion(
        version=result["version"],
        model_path=result["model_path"],
        accuracy=result["accuracy"],
        precision_score=result["precision"],
        recall_score=result["recall"],
        f1_score=result["f1"],
        auc_score=result["auc"],
        metrics_json={
            "confusion_matrix": result["confusion_matrix"],
            "roc_curve": result["roc_curve"],
            "feature_importance": result["feature_importance"],
        },
        feature_names={"names": result["feature_names"]},
        is_active=True,
        training_samples=result["training_samples"],
    )
    db.add(model_ver)
    db.commit()

    return TrainResponse(
        model_version=result["version"],
        accuracy=result["accuracy"],
        precision=result["precision"],
        recall=result["recall"],
        f1=result["f1"],
        auc=result["auc"],
        training_samples=result["training_samples"],
        test_samples=result["test_samples"],
        feature_names=result["feature_names"],
    )


@router.post("/predict/{call_id}", response_model=PredictResponse)
def predict_call(call_id: str, db: Session = Depends(get_db)):
    """Predict purchase probability for a specific call."""
    analysis = db.query(AnalysisResult).filter(AnalysisResult.call_id == call_id).first()
    if not analysis or not analysis.features:
        raise HTTPException(status_code=400, detail="Call has no analysis features. Ensure it has been analyzed first.")

    active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    if not active_model:
        raise HTTPException(status_code=400, detail="No trained model available. Train a model first.")

    result = prediction_service.predict(analysis.features, active_model.version)

    existing = db.query(Prediction).filter(Prediction.call_id == call_id).first()
    if existing:
        existing.purchase_probability = result["purchase_probability"]
        existing.predicted_outcome = result["predicted_outcome"]
        existing.feature_importance = {"features": result["feature_importance"]}
        existing.model_version = active_model.version
    else:
        pred = Prediction(
            call_id=call_id,
            purchase_probability=result["purchase_probability"],
            predicted_outcome=result["predicted_outcome"],
            feature_importance={"features": result["feature_importance"]},
            model_version=active_model.version,
        )
        db.add(pred)

    db.commit()

    return PredictResponse(
        call_id=call_id,
        purchase_probability=result["purchase_probability"],
        predicted_outcome=result["predicted_outcome"],
        feature_importance=result["feature_importance"],
        model_version=active_model.version,
    )


@router.post("/predict-batch", response_model=BatchPredictResponse)
def predict_batch(db: Session = Depends(get_db)):
    """Run predictions on all analyzed calls that don't have predictions yet."""
    active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    if not active_model:
        raise HTTPException(status_code=400, detail="No trained model available.")

    analyses = (
        db.query(AnalysisResult)
        .outerjoin(Prediction, AnalysisResult.call_id == Prediction.call_id)
        .filter(Prediction.id.is_(None))
        .filter(AnalysisResult.features.isnot(None))
        .all()
    )

    predicted = 0
    errors = 0
    for analysis in analyses:
        try:
            result = prediction_service.predict(analysis.features, active_model.version)
            pred = Prediction(
                call_id=analysis.call_id,
                purchase_probability=result["purchase_probability"],
                predicted_outcome=result["predicted_outcome"],
                feature_importance={"features": result["feature_importance"]},
                model_version=active_model.version,
            )
            db.add(pred)
            predicted += 1
        except Exception:
            errors += 1

    db.commit()
    return BatchPredictResponse(predicted=predicted, skipped=0, errors=errors)


@router.get("/models", response_model=list[ModelVersionResponse])
def list_models(db: Session = Depends(get_db)):
    return db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).all()


@router.get("/models/{version}/metrics", response_model=ModelMetricsDetail)
def get_model_metrics(version: str, db: Session = Depends(get_db)):
    model = db.query(ModelVersion).filter(ModelVersion.version == version).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model version not found")

    metrics = model.metrics_json or {}
    return ModelMetricsDetail(
        version=model.version,
        accuracy=model.accuracy or 0,
        precision=model.precision_score or 0,
        recall=model.recall_score or 0,
        f1=model.f1_score or 0,
        auc=model.auc_score or 0,
        confusion_matrix=metrics.get("confusion_matrix", [[0, 0], [0, 0]]),
        roc_curve=metrics.get("roc_curve", {"fpr": [], "tpr": [], "thresholds": []}),
        feature_importance=metrics.get("feature_importance", []),
    )


@router.post("/models/{version}/activate")
def activate_model(version: str, db: Session = Depends(get_db)):
    model = db.query(ModelVersion).filter(ModelVersion.version == version).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model version not found")
    db.query(ModelVersion).update({"is_active": False})
    model.is_active = True
    db.commit()
    return {"detail": f"Model {version} activated"}
