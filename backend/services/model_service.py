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

    def predict_flow(self, features: dict, flow_meta: dict = None) -> dict:
        if not self.is_ready:
            raise RuntimeError("Model not loaded")

        # --- Rule-based pre-check for unidirectional flood attacks ---
        # ML model was trained on bidirectional flows (CICFlowMeter).
        # SYN floods are unidirectional: high fwd_pkts, zero bwd_pkts.
        # Model cannot detect these reliably, so we add a heuristic layer.
        if flow_meta:
            fwd = flow_meta.get('fwd_pkts', 0)
            bwd = flow_meta.get('bwd_pkts', 0)
            duration = max(flow_meta.get('duration', 1e-6), 1e-6)
            pkt_rate = (fwd + bwd) / duration

            # SYN flood signature: many fwd packets, no responses, high rate
            if fwd >= 50 and bwd == 0 and pkt_rate > 100:
                return {
                    "prediction": 1,
                    "risk_level": "ATTACK",
                    "method": "heuristic_syn_flood"
                }

            # Asymmetric flood: heavy fwd traffic with minimal responses
            if fwd > 0 and bwd >= 0:
                fwd_ratio = fwd / (fwd + bwd + 1e-6)
                if fwd_ratio > 0.98 and fwd >= 30 and pkt_rate > 50:
                    return {
                        "prediction": 1,
                        "risk_level": "ATTACK",
                        "method": "heuristic_asymmetric_flood"
                    }

        # --- ML model inference ---
        df     = pd.DataFrame([features])
        scaled = self.scaler.transform(df)

        proba  = self.model.predict_proba(scaled)[0]
        attack_prob = proba[1]

        # Lowered from 0.7 → 0.5 to improve sensitivity for partial matches
        ATTACK_THRESHOLD = 0.5
        pred = 1 if attack_prob >= ATTACK_THRESHOLD else 0

        return {
            "prediction": pred,
            "risk_level": "BENIGN" if pred == 0 else "ATTACK",
            "method": "ml_model",
            "attack_prob": round(float(attack_prob), 4)
        }


model_service = ModelService()