import os
import re
import secrets
import subprocess
from typing import Optional

from flask import current_app

from app.extensions import db
from app.models.user import User

try:
    import pexpect  # type: ignore
except Exception:  # pragma: no cover - optional dependency on legacy hosts
    pexpect = None


def is_system_auth_enabled() -> bool:
    return bool(current_app.config.get('TAKEPANEL_SYSTEM_AUTH_ENABLED', True))


def system_auth_helper_path() -> str:
    return current_app.config.get('TAKEPANEL_SYSTEM_AUTH_HELPER', '/usr/local/bin/takepanel-auth-system')


def _system_auth_timeout() -> int:
    return int(current_app.config.get('TAKEPANEL_SYSTEM_AUTH_TIMEOUT', 10))


def normalize_login_identifier(payload: dict) -> str:
    # Backward-compatible inputs from old clients: email/password.
    return (payload.get('identifier') or payload.get('email') or payload.get('username') or '').strip()


def local_user_role(username: str) -> str:
    admins = {
        entry.strip().lower()
        for entry in current_app.config.get('TAKEPANEL_SYSTEM_ADMIN_USERS', {'root'})
        if str(entry).strip()
    }
    return 'admin' if username.lower() in admins else 'user'


def derive_username(identifier: str) -> str:
    # Accept either "root" or "root@host.local" and use local-part as Linux username.
    return identifier.split('@', 1)[0].strip().lower()


def _authenticate_via_helper(username: str, password: str) -> bool:
    """Validate a Linux account password using a root-owned helper via sudo."""
    helper = system_auth_helper_path()
    if not os.path.exists(helper):
        return False

    timeout = _system_auth_timeout()
    try:
        proc = subprocess.run(
            ['sudo', '-n', helper, username],
            input=password + '\n',
            text=True,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
        return proc.returncode == 0
    except Exception:
        return False


def _authenticate_via_su(username: str, password: str) -> bool:
    """Validate a Linux account password using the local su binary.

    The application runs as the non-root `takepanel` user, so we need a
    privileged setuid helper. `su` provides that behavior across AlmaLinux,
    Ubuntu, and most Linux distributions.
    """

    if pexpect is None:
        return False

    timeout = _system_auth_timeout()
    child = pexpect.spawn('su', ['-', username, '-c', '/bin/true'], encoding='utf-8', timeout=timeout)
    try:
        idx = child.expect(
            [
                re.compile(r'(?i)password:'),
                re.compile(r'(?i)authentication failure'),
                pexpect.EOF,
                pexpect.TIMEOUT,
            ],
            timeout=timeout,
        )
        if idx != 0:
            return False

        child.sendline(password)
        idx = child.expect(
            [
                pexpect.EOF,
                re.compile(r'(?i)password:'),
                re.compile(r'(?i)authentication failure'),
                pexpect.TIMEOUT,
            ],
            timeout=timeout,
        )
        return idx == 0 and child.exitstatus == 0
    except Exception:
        return False
    finally:
        try:
            child.close(force=True)
        except Exception:
            pass


def authenticate_system_user(identifier: str, password: str) -> Optional[User]:
    if not is_system_auth_enabled():
        return None

    username = derive_username(identifier)
    if not username or len(username) > 64:
        return None

    if not _authenticate_via_helper(username, password) and not _authenticate_via_su(username, password):
        return None

    # Keep a deterministic panel identity for Linux users.
    panel_email = f'{username}@system.local'
    user = User.query.filter_by(email=panel_email).first()
    if not user:
        user = User(email=panel_email, role=local_user_role(username), is_active=True)
        # Keep an internal random hash; actual auth is delegated to the OS.
        user.set_password(secrets.token_urlsafe(24))
        db.session.add(user)
    else:
        user.role = local_user_role(username)
        user.is_active = True

    db.session.commit()
    return user
