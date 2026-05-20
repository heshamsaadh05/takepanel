from datetime import datetime, UTC

from app.extensions import db


class ManagedFTPAccount(db.Model):
    __tablename__ = 'managed_ftp_accounts'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    protocol = db.Column(db.String(32), nullable=False, default='vsftpd')
    home_directory = db.Column(db.String(512), nullable=False)
    permissions = db.Column(db.String(16), nullable=False, default='rw')
    is_enabled = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC), nullable=False)
