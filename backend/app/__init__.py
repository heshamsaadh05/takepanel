import os

from flask import Flask
from flask_cors import CORS
from importlib import import_module

from config import Config
from app.api.routes import register_routes
from app.extensions import db, migrate, jwt
from app.models.token_blocklist import TokenBlocklist


def create_app(config_class=Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app, resources={r'/api/*': {'origins': '*'}})

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    @jwt.token_in_blocklist_loader
    def is_token_revoked(_jwt_header, jwt_payload):
        # Reject requests authenticated with explicitly revoked tokens.
        jti = jwt_payload['jti']
        return db.session.query(TokenBlocklist.id).filter_by(jti=jti).scalar() is not None

    register_routes(app)
    _bootstrap_runtime_state(app)

    return app


def _bootstrap_runtime_state(app: Flask) -> None:
    """Ensure DB schema and default admin exist for first-run installs."""
    if app.config.get('TESTING') or os.getenv('PYTEST_CURRENT_TEST'):
        return

    if not app.config.get('TAKEPANEL_BOOTSTRAP_DB_ON_START', True):
        return

    try:
        with app.app_context():
            # Import model registry so create_all sees every table.
            import_module('app.models')
            from app.models.user import User

            db.create_all()

            admin_email = app.config.get('TAKEPANEL_ADMIN_EMAIL', 'admin@takepanel.local').lower()
            admin_password = app.config.get('TAKEPANEL_ADMIN_PASSWORD', 'ChangeMe123!')

            existing = User.query.filter_by(email=admin_email).first()
            if not existing:
                admin = User(email=admin_email, role='admin', is_active=True)
                admin.set_password(admin_password)
                db.session.add(admin)
                db.session.commit()
            elif not existing.is_active:
                existing.is_active = True
                db.session.commit()
    except Exception:
        # Do not crash app startup; keep the API bootable for diagnostics.
        app.logger.exception('Runtime bootstrap failed.')
