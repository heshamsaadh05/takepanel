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
        admin = User(email='admin-monitor@test.local', role='admin')
        admin.set_password('StrongPass123!')
        reseller = User(email='reseller-monitor@test.local', role='reseller')
        reseller.set_password('StrongPass123!')
        user = User(email='user-monitor@test.local', role='user')
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


def test_fetch_metrics_and_alerts(client):
    token = login(client, 'reseller-monitor@test.local').get_json()['access_token']
    res = client.get('/api/monitoring/metrics?cpu=10&ram=10&disk=10&network_mbps=10', headers=auth(token))
    assert res.status_code == 200
    body = res.get_json()
    assert 'metrics' in body
    assert 'alerts' in body


def test_apply_firewall_and_fail2ban_admin_only(client):
    admin_token = login(client, 'admin-monitor@test.local').get_json()['access_token']
    user_token = login(client, 'user-monitor@test.local').get_json()['access_token']

    fw_ok = client.post('/api/security/firewall/apply', headers=auth(admin_token))
    assert fw_ok.status_code == 200

    f2b_ok = client.post('/api/security/fail2ban/apply', headers=auth(admin_token))
    assert f2b_ok.status_code == 200

    fw_forbidden = client.post('/api/security/firewall/apply', headers=auth(user_token))
    assert fw_forbidden.status_code == 403


def test_ssl_setup_validation_and_success(client):
    admin_token = login(client, 'admin-monitor@test.local').get_json()['access_token']

    bad = client.post(
        '/api/security/ssl/setup',
        json={'domain': 'bad domain', 'email': 'admin@example.com'},
        headers=auth(admin_token),
    )
    assert bad.status_code == 400

    ok = client.post(
        '/api/security/ssl/setup',
        json={'domain': 'example.com', 'email': 'admin@example.com'},
        headers=auth(admin_token),
    )
    assert ok.status_code == 200
