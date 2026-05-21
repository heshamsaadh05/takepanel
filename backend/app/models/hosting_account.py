from datetime import datetime, timezone

from app.extensions import db


class ManagedHostingAccount(db.Model):
    __tablename__ = 'managed_hosting_accounts'

    id = db.Column(db.Integer, primary_key=True)
    domain = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    contact_email = db.Column(db.String(320), nullable=False)
    package_name = db.Column(db.String(64), nullable=False, default='starter')
    select_options_manually = db.Column(db.Boolean, nullable=False, default=False)
    server_type = db.Column(db.String(16), nullable=False, default='nginx')
    cgi_access = db.Column(db.Boolean, nullable=False, default=True)
    cpanel_theme = db.Column(db.String(32), nullable=False, default='jupiter')
    locale = db.Column(db.String(32), nullable=False, default='en')
    enable_apache_spamassassin = db.Column(db.Boolean, nullable=False, default=False)
    enable_spam_box = db.Column(db.Boolean, nullable=False, default=False)
    mail_routing = db.Column(db.String(32), nullable=False, default='local')
    shell_access = db.Column(db.Boolean, nullable=False, default=False)
    dns_enabled = db.Column(db.Boolean, nullable=False, default=True)
    web_root = db.Column(db.String(512), nullable=False)
    home_directory = db.Column(db.String(512), nullable=False)
    status = db.Column(db.String(32), nullable=False, default='active')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
