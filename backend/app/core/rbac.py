from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request


VALID_ROLES = {'admin', 'reseller', 'user'}


def require_roles(*allowed_roles: str):
    """Restrict endpoint access to given roles."""
    normalized = {role.lower() for role in allowed_roles}

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get('role', '').lower()
            if role not in normalized:
                return jsonify({'error': 'forbidden'}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
