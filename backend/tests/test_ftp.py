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
        admin = User(email='admin-ftp@test.local', role='admin')
        admin.set_password('StrongPass123!')
        user = User(email='user-ftp@test.local', role='user')
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


def test_create_list_delete_ftp_account(client):
    token = login(client, 'admin-ftp@test.local').get_json()['access_token']

    create_res = client.post(
        '/api/ftp/accounts',
        json={
            'username': 'ftpalpha',
            'password': 'StrongFtpPass123!',
            'protocol': 'vsftpd',
            'home_directory': '/home/ftpalpha',
            'permissions': 'rw',
        },
        headers=auth(token),
    )
    assert create_res.status_code == 201
    acc_id = create_res.get_json()['id']

    list_res = client.get('/api/ftp/accounts', headers=auth(token))
    assert list_res.status_code == 200
    assert any(acc['id'] == acc_id for acc in list_res.get_json()['items'])

    delete_res = client.delete(f'/api/ftp/accounts/{acc_id}', headers=auth(token))
    assert delete_res.status_code == 200


def test_update_ftp_directory_permissions(client):
    token = login(client, 'admin-ftp@test.local').get_json()['access_token']

    acc_id = client.post(
        '/api/ftp/accounts',
        json={
            'username': 'ftpbeta',
            'password': 'StrongFtpPass123!',
            'protocol': 'openssh-sftp',
            'home_directory': '/srv/sftp/ftpbeta',
            'permissions': 'r',
        },
        headers=auth(token),
    ).get_json()['id']

    update_res = client.patch(
        f'/api/ftp/accounts/{acc_id}',
        json={'home_directory': '/srv/sftp/ftpbeta-new', 'permissions': 'rw'},
        headers=auth(token),
    )

    assert update_res.status_code == 200
    body = update_res.get_json()
    assert body['home_directory'] == '/srv/sftp/ftpbeta-new'
    assert body['permissions'] == 'rw'


def test_validation_and_rbac(client):
    admin_token = login(client, 'admin-ftp@test.local').get_json()['access_token']
    user_token = login(client, 'user-ftp@test.local').get_json()['access_token']

    invalid = client.post(
        '/api/ftp/accounts',
        json={
            'username': 'bad user',
            'password': 'StrongFtpPass123!',
            'protocol': 'vsftpd',
            'home_directory': 'relative/path',
            'permissions': 'rw',
        },
        headers=auth(admin_token),
    )
    assert invalid.status_code == 400

    forbidden = client.post(
        '/api/ftp/accounts',
        json={
            'username': 'ftpgamma',
            'password': 'StrongFtpPass123!',
            'protocol': 'proftpd',
            'home_directory': '/home/ftpgamma',
            'permissions': 'r',
        },
        headers=auth(user_token),
    )
    assert forbidden.status_code == 403
