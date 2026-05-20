from datetime import datetime, UTC

from app.extensions import db


class Website(db.Model):
    __tablename__ = 'websites'

    id = db.Column(db.Integer, primary_key=True)
    domain = db.Column(db.String(255), unique=True, nullable=False, index=True)
    web_root = db.Column(db.String(512), nullable=False)
    server_type = db.Column(db.String(16), nullable=False, default='nginx')
    status = db.Column(db.String(16), nullable=False, default='stopped')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC), nullable=False)
