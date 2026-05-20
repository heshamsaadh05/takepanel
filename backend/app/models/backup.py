from datetime import datetime, UTC

from app.extensions import db


class ManagedBackup(db.Model):
    __tablename__ = 'managed_backups'

    id = db.Column(db.Integer, primary_key=True)
    backup_name = db.Column(db.String(255), unique=True, nullable=False, index=True)
    backup_path = db.Column(db.String(1024), nullable=False)
    backup_type = db.Column(db.String(32), nullable=False, default='full')
    status = db.Column(db.String(32), nullable=False, default='completed')
    size_bytes = db.Column(db.BigInteger, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC), nullable=False)


class BackupSchedule(db.Model):
    __tablename__ = 'backup_schedules'

    id = db.Column(db.Integer, primary_key=True)
    cron_expression = db.Column(db.String(64), nullable=False)
    is_enabled = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC), nullable=False)
