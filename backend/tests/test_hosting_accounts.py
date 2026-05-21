import tempfile

import pytest

from app import create_app
from app.extensions import db
from app.models.ftp import ManagedFTPAccount
from app.models.hosting_account import ManagedHostingAccount
from app.models.user import User
from app.models.website import Website
from config import Config


@pytest.fixture()
def app():
    db_file = tempfile.NamedTemporaryFile(suffix='.db', delete=False)

    class TestConfig(Config):
        TESTING = True
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_file.name}"
        JWT_SECRET_KEY = 'test-jwt-secret-key-1234567890-ABCD'

    app = create_app(TestConfig)

    with app.app_context():
        db.create_all()

        admin = User(email='admin-account@test.local', role='admin')
        admin.set_password('StrongPass123!')
        reseller = User(email='reseller-account@test.local', role='reseller')
        reseller.set_password('StrongPass123!')
        user = User(email='user-account@test.local', role='user')
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


def fake_run_command(cmd):
    script = cmd[1] if len(cmd) > 1 else ''
    if script.endswith('create_website.sh'):
        return True, 'Website provisioned'
    if script.endswith('ftp_user_create.sh'):
        return True, 'FTP account created'
    if script.endswith('remove_website.sh'):
        return True, 'Website removed'
    if script.endswith('ftp_user_delete.sh'):
        return True, 'FTP account deleted'
    return True, 'ok'


def test_create_list_delete_hosting_account(client, monkeypatch):
    from app.api import modules as modules_module

    monkeypatch.setattr(modules_module, 'run_command', fake_run_command)

    token = login(client, 'admin-account@test.local').get_json()['access_token']

    payload = {
        'domain': 'hosted-example.com',
        'username': 'hosteduser',
        'password': 'StrongPass123!',
        'confirm_password': 'StrongPass123!',
        'email': 'owner@hosted-example.com',
        'package_name': 'Alpha-Deluxe',
        'select_options_manually': False,
        'server_type': 'nginx',
        'cgi_access': True,
        'cpanel_theme': 'jupiter',
        'locale': 'en',
        'enable_apache_spamassassin': True,
        'enable_spam_box': True,
        'mail_routing': 'local',
        'shell_access': False,
        'dns_enabled': True,
    }

    create_res = client.post('/api/hosting/accounts', json=payload, headers=auth(token))
    assert create_res.status_code == 201
    body = create_res.get_json()

    with client.application.app_context():
        assert Website.query.filter_by(domain='hosted-example.com').first() is not None
        assert ManagedFTPAccount.query.filter_by(username='hosteduser').first() is not None
        assert ManagedHostingAccount.query.filter_by(domain='hosted-example.com').first() is not None

    list_res = client.get('/api/hosting/accounts', headers=auth(token))
    assert list_res.status_code == 200
    assert any(item['id'] == body['id'] for item in list_res.get_json()['items'])

    delete_res = client.delete(f"/api/hosting/accounts/{body['id']}", headers=auth(token))
    assert delete_res.status_code == 200

    with client.application.app_context():
        assert Website.query.filter_by(domain='hosted-example.com').first() is None
        assert ManagedFTPAccount.query.filter_by(username='hosteduser').first() is None
        assert ManagedHostingAccount.query.filter_by(domain='hosted-example.com').first() is None


def test_hosting_account_validation_and_rbac(client, monkeypatch):
    from app.api import modules as modules_module

    monkeypatch.setattr(modules_module, 'run_command', fake_run_command)

    admin_token = login(client, 'admin-account@test.local').get_json()['access_token']
    user_token = login(client, 'user-account@test.local').get_json()['access_token']

    invalid = client.post(
        '/api/hosting/accounts',
        json={'domain': 'bad domain', 'username': 'baduser'},
        headers=auth(admin_token),
    )
    assert invalid.status_code == 400

    mismatch = client.post(
        '/api/hosting/accounts',
        json={
            'domain': 'mismatch-example.com',
            'username': 'mismatchuser',
            'password': 'StrongPass123!',
            'confirm_password': 'DifferentPass123!',
            'email': 'owner@mismatch-example.com',
            'package_name': 'Starter',
            'select_options_manually': False,
            'server_type': 'nginx',
            'cgi_access': True,
            'cpanel_theme': 'jupiter',
            'locale': 'en',
            'enable_apache_spamassassin': False,
            'enable_spam_box': False,
            'mail_routing': 'local',
            'shell_access': False,
            'dns_enabled': True,
        },
        headers=auth(admin_token),
    )
    assert mismatch.status_code == 400

    forbidden = client.post(
        '/api/hosting/accounts',
        json={
            'domain': 'forbidden-example.com',
            'username': 'forbiddenuser',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
            'email': 'owner@forbidden-example.com',
            'package_name': 'Starter',
            'select_options_manually': False,
            'server_type': 'nginx',
            'cgi_access': True,
            'cpanel_theme': 'jupiter',
            'locale': 'en',
            'enable_apache_spamassassin': False,
            'enable_spam_box': False,
            'mail_routing': 'local',
            'shell_access': False,
            'dns_enabled': True,
        },
        headers=auth(user_token),
    )
    assert forbidden.status_code == 403
