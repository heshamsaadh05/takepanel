import secrets
from typing import Optional

from flask import current_app

from app.extensions import db
from app.models.user import User

try:
    import pam  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    pam = None


def is_system_auth_enabled() -> bool:
    return bool(current_app.config.get('TAKEPANEL_SYSTEM_AUTH_ENABLED', True))


def normalize_login_identifier(payload: dict) -> str:
    # Backward-compatible inputs from old clients: email/password.
    raw = (payload.get('identifier') or payload.get('email') or payload.get('username') or '').strip()
    return raw


def local_user_role(username: str) -> str:
    admins = current_app.config.get('TAKEPANEL_SYSTEM_ADMIN_USERS', {'root'})
    return 'admin' if username in admins else 'user'


def derive_username(identifier: str) -> str:
    # Accept either "root" or "root@host.local" and use local-part as Linux username.
    return identifier.split('@', 1)[0].strip().lower()


def authenticate_system_user(identifier: str, password: str) -> Optional[User]:
    if not is_system_auth_enabled() or pam is None:
        return None

    username = derive_username(identifier)
    if not username or len(username) > 64:
        return None

    authenticator = pam.pam()
    if not authenticator.authenticate(username, password):
        return None

    # Keep a deterministic panel identity for Linux users.
    panel_email = f'{username}@system.local'
    user = User.query.filter_by(email=panel_email).first()
    if not user:
        user = User(email=panel_email, role=local_user_role(username), is_active=True)
        # Keep an internal random hash; actual auth is delegated to PAM.
        user.set_password(secrets.token_urlsafe(24))
        db.session.add(user)
    else:
        user.role = local_user_role(username)
        user.is_active = True

    db.session.commit()
    return user
