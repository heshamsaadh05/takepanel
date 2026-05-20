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
        admin = User(email='admin-backup@test.local', role='admin')
        admin.set_password('StrongPass123!')
        reseller = User(email='reseller-backup@test.local', role='reseller')
        reseller.set_password('StrongPass123!')
        user = User(email='user-backup@test.local', role='user')
        user.set_password('StrongPass123!')
        db.session.add_all([admin, reseller, user])
        db.session.commit()

    yield app


@pytest.fixture()
def client(app):
    return app.test_client()


def login(client, email: str):
    return client.post('/api/auth/login', json={'email': email, 'password': 'StrongPass123!'})


def auth(token: str):
    return {'Authorization': f'Bearer {token}'}


def test_run_and_list_backups(client):
    token = login(client, 'admin-backup@test.local').get_json()['access_token']

    run_res = client.post('/api/backups/run', json={'backup_type': 'full'}, headers=auth(token))
    assert run_res.status_code == 201

    list_res = client.get('/api/backups', headers=auth(token))
    assert list_res.status_code == 200
    assert len(list_res.get_json()['items']) >= 1


def test_restore_backup(client):
    token = login(client, 'admin-backup@test.local').get_json()['access_token']

    backup_id = client.post('/api/backups/run', json={'backup_type': 'full'}, headers=auth(token)).get_json()['id']
    restore_res = client.post('/api/backups/restore', json={'backup_id': backup_id}, headers=auth(token))
    assert restore_res.status_code == 200


def test_schedule_management(client):
    admin_token = login(client, 'admin-backup@test.local').get_json()['access_token']

    set_res = client.post(
        '/api/backups/schedule',
        json={'cron_expression': '0 3 * * *', 'is_enabled': True},
        headers=auth(admin_token),
    )
    assert set_res.status_code == 200

    get_res = client.get('/api/backups/schedule', headers=auth(admin_token))
    assert get_res.status_code == 200
    assert get_res.get_json()['item']['cron_expression'] == '0 3 * * *'


def test_backup_rbac_and_validation(client):
    reseller_token = login(client, 'reseller-backup@test.local').get_json()['access_token']
    user_token = login(client, 'user-backup@test.local').get_json()['access_token']

    forbidden = client.post('/api/backups/run', json={'backup_type': 'full'}, headers=auth(user_token))
    assert forbidden.status_code == 403

    # restore is admin-only
    restore_forbidden = client.post('/api/backups/restore', json={'backup_id': 1}, headers=auth(reseller_token))
    assert restore_forbidden.status_code == 403

    invalid_cron = client.post(
        '/api/backups/schedule',
        json={'cron_expression': '0 2 * *', 'is_enabled': True},
        headers=auth(login(client, 'admin-backup@test.local').get_json()['access_token']),
    )
    assert invalid_cron.status_code == 400
