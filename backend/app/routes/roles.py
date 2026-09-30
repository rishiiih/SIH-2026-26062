from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.role import Role, Permission, RolePermission
from app.models.user import User
from app.services.permission_service import PermissionService
from app.services.audit_service import AuditService
from app.schemas.role import RoleSchema, PermissionSchema

bp = Blueprint('roles', __name__, url_prefix='/api/roles')

@bp.route('', methods=['GET'])
@jwt_required()
def list_roles():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not PermissionService.has_permission(current_user, 'role:read'):
        return jsonify({'error': 'Permission denied'}), 403

    roles = Role.query.all()
    schema = RoleSchema(many=True)
    return jsonify(schema.dump(roles)), 200

@bp.route('/<role_id>', methods=['GET'])
@jwt_required()
def get_role(role_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not PermissionService.has_permission(current_user, 'role:read'):
        return jsonify({'error': 'Permission denied'}), 403

    role = Role.query.get(role_id)
    if not role:
        return jsonify({'error': 'Role not found'}), 404

    schema = RoleSchema()
    return jsonify(schema.dump(role)), 200

@bp.route('', methods=['POST'])
@jwt_required()
def create_role():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not PermissionService.has_permission(current_user, 'role:create'):
        return jsonify({'error': 'Permission denied'}), 403

    data = request.get_json()
    if Role.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Role already exists'}), 400

    role = Role(name=data['name'], description=data.get('description'))
    db.session.add(role)
    db.session.commit()
    AuditService.log_action(current_user, 'create', 'role', str(role.id), after_data={'name': role.name})

    schema = RoleSchema()
    return jsonify(schema.dump(role)), 201

@bp.route('/<role_id>', methods=['PUT'])
@jwt_required()
def update_role(role_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not PermissionService.has_permission(current_user, 'role:update'):
        return jsonify({'error': 'Permission denied'}), 403

    role = Role.query.get(role_id)
    if not role:
        return jsonify({'error': 'Role not found'}), 404

    data = request.get_json()
    before_data = {'name': role.name, 'description': role.description}

    if 'name' in data:
        role.name = data['name']
    if 'description' in data:
        role.description = data['description']

    db.session.commit()
    AuditService.log_action(current_user, 'update', 'role', str(role.id), before_data=before_data, after_data={'name': role.name, 'description': role.description})

    schema = RoleSchema()
    return jsonify(schema.dump(role)), 200

@bp.route('/permissions', methods=['GET'])
@jwt_required()
def list_permissions():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not PermissionService.has_permission(current_user, 'role:read'):
        return jsonify({'error': 'Permission denied'}), 403

    permissions = Permission.query.all()
    schema = PermissionSchema(many=True)
    return jsonify(schema.dump(permissions)), 200
