from flask import Blueprint, request, jsonify
from services.model_service import model_service

predict_bp = Blueprint('predict', __name__)

@predict_bp.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status"      : "healthy",
        "model_loaded": model_service.is_ready
    })

@predict_bp.route('/predict', methods=['POST'])
def predict():
    if not model_service.is_ready:
        return jsonify({"error": "Model not active"}), 503

    try:
        result = model_service.predict(request.get_json())
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400