from flask import Flask
from flask_cors import CORS

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

    return app
