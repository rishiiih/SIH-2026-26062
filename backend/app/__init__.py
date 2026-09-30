from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # Configure CORS to allow requests from frontend
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    }, supports_credentials=True)

    # 1. Existing blueprints
    from app.routes import auth, users, roles, stations, audit_log
    
    # 2. Import the new route files you just stubbed
    # from app.routes import cargo, inventory, emergency, sync, dashboard

    # Register existing blueprints
    app.register_blueprint(auth.bp)
    app.register_blueprint(users.bp)
    app.register_blueprint(roles.bp)
    app.register_blueprint(stations.bp)
    app.register_blueprint(audit_log.bp)

    # ---------------------------------------------------------------------
    # Phase 2-5 Blueprints
    # Note: Keep these commented out until you actually define 
    # `bp = Blueprint(...)` inside their respective files!
    # ---------------------------------------------------------------------
    # app.register_blueprint(cargo.bp)
    # app.register_blueprint(inventory.bp)
    # app.register_blueprint(emergency.bp)
    # app.register_blueprint(sync.bp)
    # app.register_blueprint(dashboard.bp)

    return app