import joblib
import pandas as pd
from config import MODEL_PATH, SCALER_PATH, FEATURE_NAMES

class ModelService:
    def __init__(self):
        self.model  = None
        self.scaler = None
        self._load()

    def _load(self):
        try:
            self.model  = joblib.load(MODEL_PATH)
            self.scaler = joblib.load(SCALER_PATH)
            print("Model loaded successfully.")
        except Exception as e:
            print(f"Model load error: {e}")

    @property
    def is_ready(self):
        return self.model is not None and self.scaler is not None

    def predict(self, features: dict) -> dict:
        if not self.is_ready:
            raise RuntimeError("Model not loaded")

        values = {name: float(features.get(name) or 0) for name in FEATURE_NAMES}
        df     = pd.DataFrame([values])
        scaled = self.scaler.transform(df)
        pred   = int(self.model.predict(scaled)[0])

        return {
            "prediction": pred,
            "risk_level": "LOW" if pred == 0 else "HIGH"
        }

    def predict_flow(self, features: dict) -> dict:
        if not self.is_ready:
            raise RuntimeError("Model not loaded")

        df     = pd.DataFrame([features])
        scaled = self.scaler.transform(df)
        pred   = int(self.model.predict(scaled)[0])

        return {
            "prediction": pred,
            "risk_level": "BENIGN" if pred == 0 else "ATTACK"
        }


model_service = ModelService()