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
        admin = User(email='admin-db@test.local', role='admin')
        admin.set_password('StrongPass123!')
        user = User(email='user-db@test.local', role='user')
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


def test_create_list_delete_database(client):
    token = login(client, 'admin-db@test.local').get_json()['access_token']

    create_res = client.post('/api/databases', json={'name': 'appdb', 'engine': 'mysql'}, headers=auth(token))
    assert create_res.status_code == 201

    list_res = client.get('/api/databases', headers=auth(token))
    assert list_res.status_code == 200
    assert any(item['name'] == 'appdb' for item in list_res.get_json()['items'])

    db_id = create_res.get_json()['id']
    delete_res = client.delete(f'/api/databases/{db_id}', headers=auth(token))
    assert delete_res.status_code == 200


def test_database_user_crud(client):
    token = login(client, 'admin-db@test.local').get_json()['access_token']

    create_res = client.post(
        '/api/databases/users',
        json={'username': 'appuser', 'password': 'StrongPass789!', 'host': '%'},
        headers=auth(token),
    )
    assert create_res.status_code == 201

    list_res = client.get('/api/databases/users', headers=auth(token))
    assert list_res.status_code == 200
    assert any(item['username'] == 'appuser' for item in list_res.get_json()['items'])

    user_id = create_res.get_json()['id']
    delete_res = client.delete(f'/api/databases/users/{user_id}', headers=auth(token))
    assert delete_res.status_code == 200


def test_grant_permissions(client):
    token = login(client, 'admin-db@test.local').get_json()['access_token']

    db_res = client.post('/api/databases', json={'name': 'grantdb', 'engine': 'mariadb'}, headers=auth(token)).get_json()
    user_res = client.post(
        '/api/databases/users',
        json={'username': 'grantuser', 'password': 'StrongPass555!', 'host': 'localhost'},
        headers=auth(token),
    ).get_json()

    grant_res = client.post(
        '/api/databases/grants',
        json={
            'database_id': db_res['id'],
            'db_user_id': user_res['id'],
            'privileges': 'SELECT,INSERT,UPDATE'
        },
        headers=auth(token),
    )
    assert grant_res.status_code == 200

    list_grants = client.get('/api/databases/grants', headers=auth(token))
    assert list_grants.status_code == 200
    assert any(g['database_name'] == 'grantdb' for g in list_grants.get_json()['items'])


def test_validation_and_rbac(client):
    admin_token = login(client, 'admin-db@test.local').get_json()['access_token']
    user_token = login(client, 'user-db@test.local').get_json()['access_token']

    invalid_res = client.post('/api/databases', json={'name': 'bad-name-with-dash'}, headers=auth(admin_token))
    assert invalid_res.status_code == 400

    forbidden_res = client.post('/api/databases', json={'name': 'userdb'}, headers=auth(user_token))
    assert forbidden_res.status_code == 403
