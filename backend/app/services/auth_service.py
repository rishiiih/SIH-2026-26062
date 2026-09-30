from app import db
from app.models.user import User
from flask_jwt_extended import create_access_token, create_refresh_token

class AuthService:
    @staticmethod
    def authenticate(username, password):
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password) and user.is_active:
            return user
        return None

    @staticmethod
    def create_tokens(user):
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }

    @staticmethod
    def create_user(data):
        user = User(
            username=data['username'],
            email=data['email'],
            full_name=data['full_name'],
            role_id=data['role_id'],
            station_id=data.get('station_id')
        )
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        return user
