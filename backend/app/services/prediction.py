"""Prediction service for training and running the sales prediction model."""
import uuid
import json
import pickle
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, roc_curve,
)
from xgboost import XGBClassifier

from app.core.config import settings
from app.services.feature_engineering import get_feature_names


class PredictionService:
    def __init__(self):
        self.model_dir = Path(settings.MODEL_DIR)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self._active_model = None
        self._active_version = None

    def train(self, features_df: pd.DataFrame, labels: np.ndarray, test_size: float = 0.2) -> dict:
        """Train an XGBoost model and save it."""
        X_train, X_test, y_train, y_test = train_test_split(
            features_df, labels, test_size=test_size, random_state=42, stratify=labels
        )

        model = XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            min_child_weight=3,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric="logloss",
            use_label_encoder=False,
        )

        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]

        accuracy = float(accuracy_score(y_test, y_pred))
        precision = float(precision_score(y_test, y_pred, zero_division=0))
        recall = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        auc = float(roc_auc_score(y_test, y_proba))

        cm = confusion_matrix(y_test, y_pred).tolist()
        fpr, tpr, thresholds = roc_curve(y_test, y_proba)
        roc_data = {
            "fpr": [round(float(x), 4) for x in fpr],
            "tpr": [round(float(x), 4) for x in tpr],
            "thresholds": [round(float(x), 4) for x in thresholds],
        }

        feature_names = list(features_df.columns)
        importances = model.feature_importances_
        feature_imp = sorted(
            [{"feature": fn, "importance": round(float(imp), 4)} for fn, imp in zip(feature_names, importances)],
            key=lambda x: x["importance"],
            reverse=True,
        )

        version = f"v{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        model_path = self.model_dir / f"model_{version}.pkl"
        with open(model_path, "wb") as f:
            pickle.dump(model, f)

        metrics_path = self.model_dir / f"metrics_{version}.json"
        with open(metrics_path, "w") as f:
            json.dump({
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "auc": auc,
                "confusion_matrix": cm,
                "roc_curve": roc_data,
                "feature_importance": feature_imp,
            }, f)

        self._active_model = model
        self._active_version = version

        return {
            "version": version,
            "model_path": str(model_path),
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "auc": auc,
            "confusion_matrix": cm,
            "roc_curve": roc_data,
            "feature_importance": feature_imp,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "feature_names": feature_names,
        }

    def predict(self, features: dict, model_version: str | None = None) -> dict:
        """Predict purchase probability for a single call."""
        model = self._load_model(model_version)
        feature_names = get_feature_names()
        feature_vector = np.array([[features.get(fn, 0) for fn in feature_names]])
        df = pd.DataFrame(feature_vector, columns=feature_names)

        proba = float(model.predict_proba(df)[0][1])
        predicted = "purchase" if proba >= 0.5 else "no_purchase"

        try:
            import shap
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(df)
            importance = sorted(
                [{"feature": fn, "shap_value": round(float(sv), 4)}
                 for fn, sv in zip(feature_names, shap_values[0])],
                key=lambda x: abs(x["shap_value"]),
                reverse=True,
            )
        except Exception:
            importances = model.feature_importances_
            importance = sorted(
                [{"feature": fn, "importance": round(float(imp), 4)}
                 for fn, imp in zip(feature_names, importances)],
                key=lambda x: x.get("importance", abs(x.get("shap_value", 0))),
                reverse=True,
            )

        return {
            "purchase_probability": round(proba, 4),
            "predicted_outcome": predicted,
            "feature_importance": importance[:15],
        }

    def _load_model(self, version: str | None = None):
        if version and self._active_version == version and self._active_model:
            return self._active_model
        if not version and self._active_model:
            return self._active_model

        if version:
            model_path = self.model_dir / f"model_{version}.pkl"
        else:
            model_files = sorted(self.model_dir.glob("model_v*.pkl"), reverse=True)
            if not model_files:
                raise ValueError("No trained model found. Train a model first.")
            model_path = model_files[0]

        with open(model_path, "rb") as f:
            model = pickle.load(f)

        self._active_model = model
        self._active_version = version or model_path.stem.replace("model_", "")
        return model


prediction_service = PredictionService()
