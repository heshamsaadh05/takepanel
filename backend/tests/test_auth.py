import tempfile

import pytest

from app import create_app
from app.extensions import db
from app.models.user import User


@pytest.fixture()
def app():
    db_file = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
    app = create_app()
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{db_file.name}",
        JWT_SECRET_KEY='test-jwt',
    )

    with app.app_context():
        db.create_all()
        admin = User(email='admin@test.local', role='admin')
        admin.set_password('StrongPass123!')

        reseller = User(email='reseller@test.local', role='reseller')
        reseller.set_password('StrongPass123!')

        standard = User(email='user@test.local', role='user')
        standard.set_password('StrongPass123!')

        db.session.add_all([admin, reseller, standard])
        db.session.commit()

    yield app


@pytest.fixture()
def client(app):
    return app.test_client()


def login(client, email: str, password: str):
    return client.post('/api/auth/login', json={'email': email, 'password': password})


def auth_header(token: str):
    return {'Authorization': f'Bearer {token}'}


def test_login_success(client):
    res = login(client, 'admin@test.local', 'StrongPass123!')
    assert res.status_code == 200
    assert 'access_token' in res.get_json()


def test_login_failure(client):
    res = login(client, 'admin@test.local', 'bad-password')
    assert res.status_code == 401


def test_login_requires_identifier(client):
    res = client.post('/api/auth/login', json={'password': 'StrongPass123!'})
    assert res.status_code == 400
    assert res.get_json()['error'] == 'identifier_required'


def test_login_with_identifier_field(client):
    res = client.post('/api/auth/login', json={'identifier': 'admin@test.local', 'password': 'StrongPass123!'})
    assert res.status_code == 200
    assert 'access_token' in res.get_json()


def test_system_user_login_via_pam_fallback(client, monkeypatch):
    from app.api import auth as auth_module

    with client.application.app_context():
        system_user = User(email='root@system.local', role='admin')
        system_user.set_password('placeholder-pass')
        db.session.add(system_user)
        db.session.commit()

    def fake_pam_auth(identifier, password):
        if identifier == 'root' and password == 'RootPass123!':
            with client.application.app_context():
                return User.query.filter_by(email='root@system.local').first()
        return None

    monkeypatch.setattr(auth_module, 'authenticate_system_user', fake_pam_auth)

    res = client.post('/api/auth/login', json={'identifier': 'root', 'password': 'RootPass123!'})
    assert res.status_code == 200
    assert res.get_json()['user']['email'] == 'root@system.local'


def test_create_user_admin_only(client):
    admin_token = login(client, 'admin@test.local', 'StrongPass123!').get_json()['access_token']

    create_res = client.post(
        '/api/auth/users',
        json={'email': 'new-user@test.local', 'password': 'AnotherPass123!', 'role': 'user'},
        headers=auth_header(admin_token),
    )
    assert create_res.status_code == 201

    user_token = login(client, 'user@test.local', 'StrongPass123!').get_json()['access_token']
    forbidden_res = client.post(
        '/api/auth/users',
        json={'email': 'x@test.local', 'password': 'AnotherPass123!', 'role': 'user'},
        headers=auth_header(user_token),
    )
    assert forbidden_res.status_code == 403


def test_list_users(client):
    admin_token = login(client, 'admin@test.local', 'StrongPass123!').get_json()['access_token']
    res = client.get('/api/auth/users', headers=auth_header(admin_token))
    assert res.status_code == 200
    assert len(res.get_json()['items']) >= 3


def test_edit_user(client):
    admin_token = login(client, 'admin@test.local', 'StrongPass123!').get_json()['access_token']

    create_res = client.post(
        '/api/auth/users',
        json={'email': 'edit-me@test.local', 'password': 'AnotherPass123!', 'role': 'user'},
        headers=auth_header(admin_token),
    ).get_json()

    edit_res = client.patch(
        f"/api/auth/users/{create_res['id']}",
        json={'role': 'reseller', 'is_active': False},
        headers=auth_header(admin_token),
    )

    assert edit_res.status_code == 200
    body = edit_res.get_json()
    assert body['role'] == 'reseller'
    assert body['is_active'] is False


def test_delete_user(client):
    admin_token = login(client, 'admin@test.local', 'StrongPass123!').get_json()['access_token']

    created = client.post(
        '/api/auth/users',
        json={'email': 'delete-me@test.local', 'password': 'AnotherPass123!', 'role': 'user'},
        headers=auth_header(admin_token),
    ).get_json()

    delete_res = client.delete(f"/api/auth/users/{created['id']}", headers=auth_header(admin_token))
    assert delete_res.status_code == 200


def test_me_endpoint(client):
    token = login(client, 'reseller@test.local', 'StrongPass123!').get_json()['access_token']
    res = client.get('/api/auth/me', headers=auth_header(token))
    assert res.status_code == 200
    assert res.get_json()['role'] == 'reseller'


def test_logout_revokes_token(client):
    token = login(client, 'admin@test.local', 'StrongPass123!').get_json()['access_token']

    logout_res = client.post('/api/auth/logout', headers=auth_header(token))
    assert logout_res.status_code == 200

    # Same token should now be rejected because it has been revoked.
    me_res = client.get('/api/auth/me', headers=auth_header(token))
    assert me_res.status_code == 401


def test_legacy_register_alias(client):
    admin_token = login(client, 'admin@test.local', 'StrongPass123!').get_json()['access_token']
    res = client.post(
        '/api/auth/register',
        json={'email': 'legacy@test.local', 'password': 'AnotherPass123!', 'role': 'user'},
        headers=auth_header(admin_token),
    )
    assert res.status_code == 201
