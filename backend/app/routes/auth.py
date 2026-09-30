from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from app import db
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService
from app.services.permission_service import PermissionService
from app.schemas.user import UserCreateSchema

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
@jwt_required()
def register():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not PermissionService.has_permission(current_user, 'user:create'):
        return jsonify({'error': 'Permission denied'}), 403

    schema = UserCreateSchema()
    try:
        data = schema.load(request.get_json())
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400

    user = AuthService.create_user(data)
    AuditService.log_action(current_user, 'create', 'user', user.id, after_data=user.to_dict())

    return jsonify({'message': 'User created successfully', 'user': user.to_dict()}), 201

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    user = AuthService.authenticate(username, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    tokens = AuthService.create_tokens(user)
    AuditService.log_action(user, 'login', 'user', user.id)

    return jsonify(tokens), 200

@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user or not user.is_active:
        return jsonify({'error': 'Invalid user'}), 401

    access_token = create_access_token(identity=user.id)
    return jsonify({'access_token': access_token}), 200

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if user:
        AuditService.log_action(user, 'logout', 'user', user.id)

    return jsonify({'message': 'Logged out successfully'}), 200

@bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(user.to_dict()), 200
