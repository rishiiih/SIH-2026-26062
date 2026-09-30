from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.station import Station
from app.models.user import User
from app.services.permission_service import PermissionService
from app.services.audit_service import AuditService
from app.schemas.station import StationSchema

bp = Blueprint('stations', __name__, url_prefix='/api/stations')

@bp.route('', methods=['GET'])
@jwt_required()
def list_stations():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not PermissionService.has_permission(current_user, 'station:read'):
        return jsonify({'error': 'Permission denied'}), 403

    stations = Station.query.all()
    schema = StationSchema(many=True)
    return jsonify(schema.dump(stations)), 200

@bp.route('/<station_id>', methods=['GET'])
@jwt_required()
def get_station(station_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not PermissionService.has_permission(current_user, 'station:read'):
        return jsonify({'error': 'Permission denied'}), 403

    station = Station.query.get(station_id)
    if not station:
        return jsonify({'error': 'Station not found'}), 404

    schema = StationSchema()
    return jsonify(schema.dump(station)), 200

@bp.route('', methods=['POST'])
@jwt_required()
def create_station():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not PermissionService.has_permission(current_user, 'station:create'):
        return jsonify({'error': 'Permission denied'}), 403

    data = request.get_json()
    if Station.query.filter_by(code=data['code']).first():
        return jsonify({'error': 'Station code already exists'}), 400

    station = Station(
        name=data['name'],
        code=data['code'],
        location=data['location'],
        latitude=data['latitude'],
        longitude=data['longitude'],
        region=data['region'],
        timezone=data['timezone'],
        is_active=data.get('is_active', True)
    )
    db.session.add(station)
    db.session.commit()
    AuditService.log_action(current_user, 'create', 'station', str(station.id), after_data={'name': station.name, 'code': station.code})

    schema = StationSchema()
    return jsonify(schema.dump(station)), 201

@bp.route('/<station_id>', methods=['PUT'])
@jwt_required()
def update_station(station_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    station = Station.query.get(station_id)
    if not station:
        return jsonify({'error': 'Station not found'}), 404

    if not PermissionService.has_permission(current_user, 'station:update', target_station_id=station.id):
        return jsonify({'error': 'Permission denied'}), 403

    data = request.get_json()
    before_data = {'name': station.name, 'code': station.code, 'location': station.location}

    if 'name' in data:
        station.name = data['name']
    if 'code' in data:
        station.code = data['code']
    if 'location' in data:
        station.location = data['location']
    if 'latitude' in data:
        station.latitude = data['latitude']
    if 'longitude' in data:
        station.longitude = data['longitude']
    if 'region' in data:
        station.region = data['region']
    if 'timezone' in data:
        station.timezone = data['timezone']
    if 'is_active' in data:
        station.is_active = data['is_active']

    db.session.commit()
    AuditService.log_action(current_user, 'update', 'station', str(station.id), before_data=before_data, after_data={'name': station.name, 'code': station.code, 'location': station.location})

    schema = StationSchema()
    return jsonify(schema.dump(station)), 200
