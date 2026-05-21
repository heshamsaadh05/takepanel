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
        admin = User(email='admin-mail@test.local', role='admin')
        admin.set_password('StrongPass123!')
        user = User(email='user-mail@test.local', role='user')
        user.set_password('StrongPass123!')
        db.session.add_all([admin, user])
        db.session.commit()

    yield app


@pytest.fixture()
def client(app):
    return app.test_client()


def login(client, email: str):
    return client.post('/api/auth/login', json={'email': email, 'password': 'StrongPass123!'})


def auth(token: str):
    return {'Authorization': f'Bearer {token}'}


def test_create_list_delete_email_account(client):
    token = login(client, 'admin-mail@test.local').get_json()['access_token']

    create_res = client.post(
        '/api/emails/accounts',
        json={'domain': 'example.com', 'local_part': 'support', 'password': 'MailPass123!'},
        headers=auth(token),
    )
    assert create_res.status_code == 201

    list_res = client.get('/api/emails/accounts', headers=auth(token))
    assert list_res.status_code == 200
    assert any(item['email'] == 'support@example.com' for item in list_res.get_json()['items'])

    account_id = create_res.get_json()['id']
    delete_res = client.delete(f'/api/emails/accounts/{account_id}', headers=auth(token))
    assert delete_res.status_code == 200


def test_email_account_status_and_password(client):
    token = login(client, 'admin-mail@test.local').get_json()['access_token']

    created = client.post(
        '/api/emails/accounts',
        json={'domain': 'example.net', 'local_part': 'sales', 'password': 'MailPass123!'},
        headers=auth(token),
    ).get_json()

    status_res = client.patch(
        f"/api/emails/accounts/{created['id']}/status",
        json={'enabled': False},
        headers=auth(token),
    )
    assert status_res.status_code == 200
    assert status_res.get_json()['is_enabled'] is False

    pass_res = client.patch(
        f"/api/emails/accounts/{created['id']}/password",
        json={'password': 'UpdatedPass456!'},
        headers=auth(token),
    )
    assert pass_res.status_code == 200


def test_list_accounts_by_domain(client):
    token = login(client, 'admin-mail@test.local').get_json()['access_token']

    client.post(
        '/api/emails/accounts',
        json={'domain': 'domain-a.com', 'local_part': 'a1', 'password': 'MailPass123!'},
        headers=auth(token),
    )
    client.post(
        '/api/emails/accounts',
        json={'domain': 'domain-b.com', 'local_part': 'b1', 'password': 'MailPass123!'},
        headers=auth(token),
    )

    filtered = client.get('/api/emails/accounts?domain=domain-a.com', headers=auth(token))
    assert filtered.status_code == 200
    items = filtered.get_json()['items']
    assert len(items) == 1
    assert items[0]['domain'] == 'domain-a.com'


def test_email_validation_and_rbac(client):
    admin_token = login(client, 'admin-mail@test.local').get_json()['access_token']
    user_token = login(client, 'user-mail@test.local').get_json()['access_token']

    invalid = client.post(
        '/api/emails/accounts',
        json={'domain': 'invalid domain', 'local_part': 'x', 'password': 'MailPass123!'},
        headers=auth(admin_token),
    )
    assert invalid.status_code == 400

    forbidden = client.post(
        '/api/emails/accounts',
        json={'domain': 'example.org', 'local_part': 'x', 'password': 'MailPass123!'},
        headers=auth(user_token),
    )
    assert forbidden.status_code == 403
