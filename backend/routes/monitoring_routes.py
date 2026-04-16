from flask import Blueprint, jsonify, request
from services.flow_service import flow_service

monitoring_bp = Blueprint('monitoring', __name__, url_prefix='/api/monitoring')

@monitoring_bp.route('/status', methods=['GET'])
def status():
    return jsonify({"monitoring_active": flow_service.active})

@monitoring_bp.route('/toggle', methods=['POST'])
def toggle():
    data       = request.get_json()
    new_state  = data.get("active", False)
    flow_service.active = new_state

    if new_state:
        flow_service.reset()

    return jsonify({"monitoring_active": flow_service.active})

@monitoring_bp.route('/data', methods=['GET'])
def data():
    with flow_service._data_lock:
        current_data = list(flow_service.realtime_data)
    return jsonify({"data": current_data})