from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.services.permission_service import PermissionService
from app.services.audit_service import AuditService
from app.schemas.user import UserSchema, UserUpdateSchema

bp = Blueprint('users', __name__, url_prefix='/api/users')

@bp.route('', methods=['GET'])
@jwt_required()
def list_users():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not PermissionService.has_permission(current_user, 'user:read'):
        return jsonify({'error': 'Permission denied'}), 403

    # Filter by station based on permissions
    query = User.query
    scope = PermissionService.PERMISSION_MATRIX.get(current_user.role.name if current_user.role else '', {}).get('user:read', 'none')
    if scope == 'own_station' and current_user.station_id:
        query = query.filter_by(station_id=current_user.station_id)
    elif scope == 'own':
        query = query.filter_by(id=current_user.id)

    users = query.all()
    schema = UserSchema(many=True)
    return jsonify(schema.dump(users)), 200

@bp.route('/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not PermissionService.has_permission(current_user, 'user:read', target_station_id=user.station_id, target_user_id=user.id):
        return jsonify({'error': 'Permission denied'}), 403

    schema = UserSchema()
    return jsonify(schema.dump(user)), 200

@bp.route('/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not PermissionService.has_permission(current_user, 'user:update', target_station_id=user.station_id, target_user_id=user.id):
        return jsonify({'error': 'Permission denied'}), 403

    schema = UserUpdateSchema()
    try:
        data = schema.load(request.get_json())
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    before_data = user.to_dict()

    for key, value in data.items():
        if hasattr(user, key):
            setattr(user, key, value)

    db.session.commit()
    AuditService.log_action(current_user, 'update', 'user', user.id, before_data=before_data, after_data=user.to_dict())

    return jsonify({'message': 'User updated successfully', 'user': user.to_dict()}), 200

@bp.route('/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not PermissionService.has_permission(current_user, 'user:delete'):
        return jsonify({'error': 'Permission denied'}), 403

    # Soft delete
    user.is_active = False
    db.session.commit()
    AuditService.log_action(current_user, 'delete', 'user', user.id, before_data={'is_active': True}, after_data={'is_active': False})

    return jsonify({'message': 'User deactivated successfully'}), 200
