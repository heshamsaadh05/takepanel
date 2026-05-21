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
        admin = User(email='admin-dns@test.local', role='admin')
        admin.set_password('StrongPass123!')
        user = User(email='user-dns@test.local', role='user')
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


def test_zone_crud(client):
    token = login(client, 'admin-dns@test.local').get_json()['access_token']

    create = client.post('/api/dns/zones', json={'domain': 'example.com', 'provider': 'bind'}, headers=auth(token))
    assert create.status_code == 201
    zone_id = create.get_json()['id']

    listed = client.get('/api/dns/zones', headers=auth(token))
    assert listed.status_code == 200
    assert any(z['id'] == zone_id for z in listed.get_json()['items'])

    deleted = client.delete(f'/api/dns/zones/{zone_id}', headers=auth(token))
    assert deleted.status_code == 200


def test_record_crud(client):
    token = login(client, 'admin-dns@test.local').get_json()['access_token']
    zone_id = client.post('/api/dns/zones', json={'domain': 'records.com', 'provider': 'bind'}, headers=auth(token)).get_json()['id']

    created = client.post(
        '/api/dns/records',
        json={'zone_id': zone_id, 'name': '@', 'record_type': 'A', 'value': '1.2.3.4', 'ttl': 300},
        headers=auth(token),
    )
    assert created.status_code == 201
    rec_id = created.get_json()['id']

    updated = client.patch(
        f'/api/dns/records/{rec_id}',
        json={'value': '5.6.7.8', 'ttl': 600},
        headers=auth(token),
    )
    assert updated.status_code == 200

    listed = client.get(f'/api/dns/records?zone_id={zone_id}', headers=auth(token))
    assert listed.status_code == 200
    assert any(r['id'] == rec_id for r in listed.get_json()['items'])

    removed = client.delete(f'/api/dns/records/{rec_id}', headers=auth(token))
    assert removed.status_code == 200


def test_mx_and_validation(client):
    token = login(client, 'admin-dns@test.local').get_json()['access_token']
    zone_id = client.post('/api/dns/zones', json={'domain': 'mx.com', 'provider': 'powerdns'}, headers=auth(token)).get_json()['id']

    missing_pri = client.post(
        '/api/dns/records',
        json={'zone_id': zone_id, 'name': '@', 'record_type': 'MX', 'value': 'mail.mx.com', 'ttl': 3600},
        headers=auth(token),
    )
    assert missing_pri.status_code == 400

    invalid_a = client.post(
        '/api/dns/records',
        json={'zone_id': zone_id, 'name': '@', 'record_type': 'A', 'value': '999.1.1.1', 'ttl': 3600},
        headers=auth(token),
    )
    assert invalid_a.status_code == 400


def test_rbac(client):
    token = login(client, 'user-dns@test.local').get_json()['access_token']
    forbidden = client.post('/api/dns/zones', json={'domain': 'forbidden.com', 'provider': 'bind'}, headers=auth(token))
    assert forbidden.status_code == 403
