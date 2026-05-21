#!/usr/bin/env python3
"""TakePanel system authentication helper.

This helper is installed root-owned to /usr/local/bin/takepanel-auth-system
and invoked from the backend through sudo. It validates a local Linux user
password against /etc/shadow without exposing the password to the shell.
"""

from __future__ import annotations

import crypt
import re
import spwd
import sys

USERNAME_RE = re.compile(r'^[a-z_][a-z0-9_-]{0,31}$', re.IGNORECASE)


def read_password() -> str:
    # Read one line only so spaces and special characters are preserved.
    return sys.stdin.readline().rstrip('\r\n')


def verify_system_password(username: str, password: str) -> bool:
    try:
        shadow_entry = spwd.getspnam(username)
    except (KeyError, PermissionError):
        return False

    shadow_hash = shadow_entry.sp_pwdp or ''
    if not shadow_hash or shadow_hash.startswith(('!', '*')):
        return False

    return crypt.crypt(password, shadow_hash) == shadow_hash


def main() -> int:
    if len(sys.argv) != 2:
        return 2

    username = sys.argv[1].strip()
    if not USERNAME_RE.fullmatch(username):
        return 2

    password = read_password()
    return 0 if verify_system_password(username, password) else 1


if __name__ == '__main__':
    raise SystemExit(main())
