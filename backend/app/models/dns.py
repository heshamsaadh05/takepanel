from datetime import datetime, timezone

from app.extensions import db


class ManagedDNSZone(db.Model):
    __tablename__ = 'managed_dns_zones'

    id = db.Column(db.Integer, primary_key=True)
    domain = db.Column(db.String(255), unique=True, nullable=False, index=True)
    provider = db.Column(db.String(32), nullable=False, default='bind')
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class ManagedDNSRecord(db.Model):
    __tablename__ = 'managed_dns_records'

    id = db.Column(db.Integer, primary_key=True)
    zone_id = db.Column(db.Integer, db.ForeignKey('managed_dns_zones.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    record_type = db.Column(db.String(16), nullable=False)
    value = db.Column(db.String(1024), nullable=False)
    ttl = db.Column(db.Integer, nullable=False, default=3600)
    priority = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
