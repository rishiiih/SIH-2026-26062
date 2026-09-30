from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.services.permission_service import PermissionService
from app.services.audit_service import AuditService

bp = Blueprint('audit_log', __name__, url_prefix='/api/audit-log')

@bp.route('', methods=['GET'])
@jwt_required()
def get_audit_log():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not PermissionService.has_permission(current_user, 'audit:read'):
        return jsonify({'error': 'Permission denied'}), 403

    user_id = request.args.get('user_id')
    entity_type = request.args.get('entity_type')
    entity_id = request.args.get('entity_id')
    station_id = request.args.get('station_id')
    limit = request.args.get('limit', 100, type=int)

    # Filter by station based on permissions
    scope = PermissionService.PERMISSION_MATRIX.get(current_user.role.name if current_user.role else '', {}).get('audit:read', 'none')
    if scope == 'own_station' and current_user.station_id:
        station_id = current_user.station_id
    elif scope == 'own':
        user_id = current_user.id

    audit_entries = AuditService.get_audit_log(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        station_id=station_id,
        limit=limit
    )

    return jsonify([entry.to_dict() for entry in audit_entries]), 200

@bp.route('/<audit_id>', methods=['GET'])
@jwt_required()
def get_audit_entry(audit_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not PermissionService.has_permission(current_user, 'audit:read'):
        return jsonify({'error': 'Permission denied'}), 403

    from app.models.audit_log import AuditLog
    entry = AuditLog.query.get(audit_id)
    if not entry:
        return jsonify({'error': 'Audit entry not found'}), 404

    # Check if user can view this entry
    scope = PermissionService.PERMISSION_MATRIX.get(current_user.role.name if current_user.role else '', {}).get('audit:read', 'none')
    if scope == 'own_station' and entry.station_id != current_user.station_id:
        return jsonify({'error': 'Permission denied'}), 403
    elif scope == 'own' and entry.user_id != current_user.id:
        return jsonify({'error': 'Permission denied'}), 403

    return jsonify(entry.to_dict()), 200
