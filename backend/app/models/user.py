from datetime import datetime, timezone

import bcrypt

try:  # pragma: no cover - unavailable on some platforms such as Windows
    import crypt as unix_crypt
except Exception:  # pragma: no cover
    unix_crypt = None

from app.extensions import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(32), nullable=False, default='user')
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def set_password(self, password: str) -> None:
        # bcrypt is intentionally used for strong adaptive password hashing.
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        self.password_hash = hashed.decode('utf-8')

    def set_password_hash(self, password_hash: str) -> None:
        # Used for system-backed accounts that need to mirror /etc/shadow.
        self.password_hash = password_hash

    def check_password(self, password: str) -> bool:
        if self.password_hash.startswith('$2'):
            return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

        if unix_crypt is not None:
            try:
                return unix_crypt.crypt(password, self.password_hash) == self.password_hash
            except Exception:
                return False

        return False
