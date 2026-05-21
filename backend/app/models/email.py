from datetime import datetime, timezone

from app.extensions import db


class ManagedEmailAccount(db.Model):
    __tablename__ = 'managed_email_accounts'

    id = db.Column(db.Integer, primary_key=True)
    domain = db.Column(db.String(255), nullable=False, index=True)
    local_part = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(320), unique=True, nullable=False, index=True)
    mailbox_path = db.Column(db.String(512), nullable=False)
    is_enabled = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (db.UniqueConstraint('domain', 'local_part', name='uq_email_domain_local_part'),)
