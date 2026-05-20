from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required

from app.core.rbac import VALID_ROLES, require_roles
from app.extensions import db
from app.models.token_blocklist import TokenBlocklist
from app.models.user import User
from app.schemas.auth import LoginSchema, RegisterSchema, UserUpdateSchema, validate_payload

auth_bp = Blueprint('auth', __name__)


@auth_bp.post('/users')
@jwt_required()
@require_roles('admin')
def create_user():
    """Create a new user account (admin-only)."""
    payload = request.get_json(silent=True) or {}
    data, errors = validate_payload(RegisterSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    if User.query.filter_by(email=data['email'].lower()).first():
        return jsonify({'error': 'email_already_exists'}), 409

    role = data.get('role', 'user').lower()
    if role not in VALID_ROLES:
        return jsonify({'error': 'invalid_role'}), 400

    user = User(email=data['email'].lower(), role=role)
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()

    return jsonify({'id': user.id, 'email': user.email, 'role': user.role}), 201


@auth_bp.post('/register')
@jwt_required()
@require_roles('admin')
def register_user():
    """Compatibility alias for legacy clients."""
    return create_user()


@auth_bp.post('/login')
def login():
    """Authenticate user and return JWT access token."""
    payload = request.get_json(silent=True) or {}
    data, errors = validate_payload(LoginSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    user = User.query.filter_by(email=data['email'].lower()).first()
    if not user or not user.is_active or not user.check_password(data['password']):
        return jsonify({'error': 'invalid_credentials'}), 401

    token = create_access_token(identity=str(user.id), additional_claims={'role': user.role})
    return jsonify({'access_token': token, 'user': {'id': user.id, 'email': user.email, 'role': user.role}})


@auth_bp.post('/logout')
@jwt_required()
def logout():
    """Revoke current token (server-side logout for API clients)."""
    jti = get_jwt()['jti']
    db.session.add(TokenBlocklist(jti=jti))
    db.session.commit()
    return jsonify({'message': 'logged_out'}), 200


@auth_bp.get('/me')
@jwt_required()
def me():
    """Return current authenticated user profile."""
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({'error': 'user_not_found'}), 404
    return jsonify({'id': user.id, 'email': user.email, 'role': user.role, 'is_active': user.is_active})


@auth_bp.get('/users')
@jwt_required()
@require_roles('admin')
def list_users():
    """List all users (admin-only)."""
    users = User.query.order_by(User.id.asc()).all()
    return jsonify(
        {
            'items': [
                {'id': u.id, 'email': u.email, 'role': u.role, 'is_active': u.is_active, 'created_at': u.created_at.isoformat()}
                for u in users
            ]
        }
    )


@auth_bp.patch('/users/<int:user_id>')
@jwt_required()
@require_roles('admin')
def edit_user(user_id: int):
    """Edit user fields (admin-only)."""
    payload = request.get_json(silent=True) or {}
    data, errors = validate_payload(UserUpdateSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    if not data:
        return jsonify({'error': 'empty_payload'}), 400

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'user_not_found'}), 404

    if 'email' in data:
        new_email = data['email'].lower()
        existing = User.query.filter(User.email == new_email, User.id != user.id).first()
        if existing:
            return jsonify({'error': 'email_already_exists'}), 409
        user.email = new_email

    if 'role' in data:
        user.role = data['role'].lower()

    if 'password' in data:
        user.set_password(data['password'])

    if 'is_active' in data:
        user.is_active = bool(data['is_active'])

    db.session.commit()
    return jsonify({'id': user.id, 'email': user.email, 'role': user.role, 'is_active': user.is_active})


@auth_bp.delete('/users/<int:user_id>')
@jwt_required()
@require_roles('admin')
def delete_user(user_id: int):
    """Delete user account (admin-only)."""
    requester_id = int(get_jwt_identity())
    if requester_id == user_id:
        return jsonify({'error': 'cannot_delete_self'}), 400

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'user_not_found'}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'deleted'}), 200
