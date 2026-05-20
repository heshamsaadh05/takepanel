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
        admin = User(email='admin-web@test.local', role='admin')
        admin.set_password('StrongPass123!')
        user = User(email='user-web@test.local', role='user')
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


def test_add_and_list_website(client):
    token = login(client, 'admin-web@test.local').get_json()['access_token']

    add_res = client.post(
        '/api/web/sites',
        json={'domain': 'example.com', 'server_type': 'nginx'},
        headers=auth(token),
    )
    assert add_res.status_code == 201

    list_res = client.get('/api/web/sites', headers=auth(token))
    assert list_res.status_code == 200
    assert len(list_res.get_json()['items']) == 1


def test_invalid_domain_validation(client):
    token = login(client, 'admin-web@test.local').get_json()['access_token']
    res = client.post(
        '/api/web/sites',
        json={'domain': 'bad domain', 'server_type': 'nginx'},
        headers=auth(token),
    )
    assert res.status_code == 400


def test_start_stop_remove_website(client):
    token = login(client, 'admin-web@test.local').get_json()['access_token']

    site = client.post(
        '/api/web/sites',
        json={'domain': 'myhost.com', 'server_type': 'apache'},
        headers=auth(token),
    ).get_json()

    start_res = client.post(f"/api/web/sites/{site['id']}/start", headers=auth(token))
    assert start_res.status_code == 200

    stop_res = client.post(f"/api/web/sites/{site['id']}/stop", headers=auth(token))
    assert stop_res.status_code == 200

    remove_res = client.delete(f"/api/web/sites/{site['id']}", headers=auth(token))
    assert remove_res.status_code == 200


def test_vhost_generation(client):
    token = login(client, 'admin-web@test.local').get_json()['access_token']

    site = client.post(
        '/api/web/sites',
        json={'domain': 'vhost.com', 'server_type': 'nginx'},
        headers=auth(token),
    ).get_json()

    res = client.post('/api/web/vhosts/generate', json={'site_id': site['id']}, headers=auth(token))
    assert res.status_code == 200


def test_service_control_admin_only(client):
    admin_token = login(client, 'admin-web@test.local').get_json()['access_token']
    user_token = login(client, 'user-web@test.local').get_json()['access_token']

    ok_res = client.post('/api/web/service/restart', headers=auth(admin_token))
    assert ok_res.status_code == 200

    forbidden_res = client.post('/api/web/service/restart', headers=auth(user_token))
    assert forbidden_res.status_code == 403
