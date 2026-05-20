from flask import Flask

from app.api.auth import auth_bp
from app.api.modules import modules_bp


def register_routes(app: Flask) -> None:
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(modules_bp, url_prefix='/api')

    @app.get('/api/health')
    def healthcheck():
        return {'status': 'ok'}
