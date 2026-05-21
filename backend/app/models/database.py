from datetime import datetime, timezone

from app.extensions import db


class ManagedDatabase(db.Model):
    __tablename__ = 'managed_databases'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False, index=True)
    engine = db.Column(db.String(16), nullable=False, default='mysql')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class ManagedDatabaseUser(db.Model):
    __tablename__ = 'managed_database_users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    host = db.Column(db.String(255), nullable=False, default='%')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class ManagedDatabaseGrant(db.Model):
    __tablename__ = 'managed_database_grants'

    id = db.Column(db.Integer, primary_key=True)
    database_id = db.Column(db.Integer, db.ForeignKey('managed_databases.id', ondelete='CASCADE'), nullable=False)
    db_user_id = db.Column(db.Integer, db.ForeignKey('managed_database_users.id', ondelete='CASCADE'), nullable=False)
    privileges = db.Column(db.String(512), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (db.UniqueConstraint('database_id', 'db_user_id', name='uq_db_user_grant'),)
