from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

bp = Blueprint('emergency', __name__, url_prefix='/api')

@bp.route('/incidents', methods=['GET'])
@jwt_required(optional=True)
def get_incidents():
    # Return mock/active incidents for the dashboard stub
    mock_incidents = [
        {
            "id": "inc-001",
            "title": "Maitri Main Substation Voltage Drop",
            "description": "Primary generator power fluctuation detected.",
            "severity": "Warning",
            "status": "OPEN",
            "station_id": 1,
            "created_at": "2026-09-30T10:00:00Z"
        }
    ]
    return jsonify({"incidents": mock_incidents}), 200