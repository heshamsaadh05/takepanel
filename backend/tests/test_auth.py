import tempfile

import pytest

from app import create_app
from app.extensions import db
from app.models.user import User
from config import Config


@pytest.fixture()
def app():
    db_file = tempfile.NamedTemporaryFile(suffix='.db', delete=False)

    class TestConfig(Config):
        TESTING = True
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_file.name}"
        JWT_SECRET_KEY = 'test-jwt'

    app = create_app(TestConfig)

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


def test_system_user_login_via_system_auth(client, monkeypatch):
    from app.core import system_auth as system_auth_module

    def fake_helper_check(username, password):
        return username == 'root' and password == 'RootPass123!'

    def fail_if_su_called(*args, **kwargs):
        raise AssertionError('su fallback should not be used when helper succeeds')

    monkeypatch.setattr(system_auth_module, '_authenticate_via_helper', fake_helper_check)
    monkeypatch.setattr(system_auth_module, '_authenticate_via_su', fail_if_su_called)

    res = client.post('/api/auth/login', json={'identifier': 'root', 'password': 'RootPass123!'})
    assert res.status_code == 200
    assert res.get_json()['user']['email'] == 'root@system.local'

    with client.application.app_context():
        created = User.query.filter_by(email='root@system.local').first()
        assert created is not None
        assert created.role == 'admin'


def test_system_user_login_falls_back_for_existing_system_placeholder(client, monkeypatch):
    from app.core import system_auth as system_auth_module

    def fake_helper_check(username, password):
        return username == 'root' and password == 'RootPass123!'

    monkeypatch.setattr(system_auth_module, '_authenticate_via_helper', fake_helper_check)

    with client.application.app_context():
        placeholder = User(email='root@system.local', role='user')
        placeholder.set_password('placeholder-password')
        db.session.add(placeholder)
        db.session.commit()

    res = client.post('/api/auth/login', json={'identifier': 'root@system.local', 'password': 'RootPass123!'})
    assert res.status_code == 200
    assert res.get_json()['user']['email'] == 'root@system.local'


def test_system_hash_password_verification(monkeypatch):
    from app.models import user as user_module

    class FakeCrypt:
        @staticmethod
        def crypt(password, salt):
            return salt if password == 'RootPass123!' else 'not-a-match'

    monkeypatch.setattr(user_module, 'unix_crypt', FakeCrypt())

    system_user = User(email='root', role='admin')
    system_user.set_password_hash('fake-system-hash')

    assert system_user.check_password('RootPass123!') is True
    assert system_user.check_password('bad-password') is False


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
