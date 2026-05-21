import logging
import os
import ipaddress
from datetime import datetime, timezone
from pathlib import Path

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.core.rbac import require_roles
from app.extensions import db
from app.models.backup import BackupSchedule, ManagedBackup
from app.models.database import ManagedDatabase, ManagedDatabaseGrant, ManagedDatabaseUser
from app.models.dns import ManagedDNSRecord, ManagedDNSZone
from app.models.email import ManagedEmailAccount
from app.models.hosting_account import ManagedHostingAccount
from app.models.ftp import ManagedFTPAccount
from app.models.website import Website
from app.schemas.dns import (
    DNSRecordCreateSchema,
    DNSRecordUpdateSchema,
    DNSZoneCreateSchema,
    validate_payload as validate_dns_payload,
)
from app.schemas.databases import (
    DatabaseCreateSchema,
    DatabaseUserCreateSchema,
    GrantPrivilegesSchema,
    validate_payload,
)
from app.schemas.backups import (
    BackupRestoreSchema,
    BackupRunSchema,
    BackupScheduleSchema,
    validate_payload as validate_backup_payload,
)
from app.schemas.emails import (
    EmailAccountCreateSchema,
    EmailAccountStatusSchema,
    EmailPasswordUpdateSchema,
    validate_payload as validate_email_payload,
)
from app.schemas.ftp import (
    FTPAccountCreateSchema,
    FTPAccountUpdateSchema,
    validate_payload as validate_ftp_payload,
)
from app.schemas.monitoring import (
    MonitoringThresholdSchema,
    SSLSetupSchema,
    validate_payload as validate_monitoring_payload,
)
from app.schemas.hosting_accounts import (
    HostingAccountCreateSchema,
    validate_payload as validate_hosting_payload,
)
from app.schemas.websites import WebsiteCreateSchema, validate_website_payload
from app.services.system_service import control_web_service, run_command
from app.utils.validators import is_valid_domain

modules_bp = Blueprint('modules', __name__)
logger = logging.getLogger(__name__)


WEB_ROOT_BASE = os.getenv('WEB_ROOT_BASE', '/var/www')
WEB_SERVICE_NAME = os.getenv('WEB_SERVICE_NAME', 'nginx')
DB_ADMIN_USER = os.getenv('DB_ADMIN_USER', 'root')
DB_ADMIN_PASSWORD = os.getenv('DB_ADMIN_PASSWORD', '')
MAIL_BASE_DIR = os.getenv('MAIL_BASE_DIR', '/var/mail/vhosts')
BACKUP_BASE_DIR = os.getenv('BACKUP_BASE_DIR', '/var/backups/takepanel')


def _is_valid_dns_record_value(record_type: str, value: str) -> bool:
    if record_type == 'A':
        try:
            ipaddress.IPv4Address(value)
            return True
        except ValueError:
            return False
    if record_type == 'AAAA':
        try:
            ipaddress.IPv6Address(value)
            return True
        except ValueError:
            return False
    if record_type == 'CNAME':
        return is_valid_domain(value.rstrip('.'))
    if record_type == 'MX':
        return is_valid_domain(value.rstrip('.'))
    if record_type == 'TXT':
        return 1 <= len(value) <= 255
    return False


def _mock_metrics() -> dict:
    return {
        'cpu': 32.5,
        'ram': 58.4,
        'disk': 71.2,
        'network': {'in_mbps': 120.5, 'out_mbps': 65.3},
    }


def _collect_metrics() -> tuple[dict, str]:
    ok, output = run_command(['bash', 'scripts/monitor_metrics.sh'])
    if not ok:
        return _mock_metrics(), output

    if output.startswith('MOCK:'):
        return _mock_metrics(), output

    parsed = {}
    for line in output.splitlines():
        if '=' in line:
            key, value = line.split('=', 1)
            parsed[key.strip()] = value.strip()

    try:
        cpu = float(parsed.get('CPU', 0))
        ram = float(parsed.get('RAM', 0))
        disk = float(parsed.get('DISK', 0))
        net_rx = float(parsed.get('NET_RX_BYTES', 0))
        net_tx = float(parsed.get('NET_TX_BYTES', 0))
    except ValueError:
        return _mock_metrics(), output

    return {
        'cpu': round(cpu, 2),
        'ram': round(ram, 2),
        'disk': round(disk, 2),
        'network': {
            'in_mbps': round((net_rx * 8) / 1_000_000, 2),
            'out_mbps': round((net_tx * 8) / 1_000_000, 2),
        },
    }, output


@modules_bp.get('/dashboard/summary')
@jwt_required()
def dashboard_summary():
    return jsonify(
        {
            'services': {
                'web': 'active',
                'database': 'active',
                'mail': 'active',
                'dns': 'active',
                'ftp': 'active',
                'backup': 'active',
                'monitoring': 'active',
            }
        }
    )


@modules_bp.get('/web/sites')
@jwt_required()
def list_sites():
    items = Website.query.order_by(Website.id.desc()).all()
    return jsonify(
        {
            'items': [
                {
                    'id': site.id,
                    'domain': site.domain,
                    'web_root': site.web_root,
                    'server_type': site.server_type,
                    'status': site.status,
                    'created_at': site.created_at.isoformat(),
                }
                for site in items
            ]
        }
    )


@modules_bp.post('/web/sites')
@jwt_required()
@require_roles('admin', 'reseller')
def add_site():
    payload = request.get_json(silent=True) or {}
    data, errors = validate_website_payload(WebsiteCreateSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    domain = data['domain'].lower().strip()
    if Website.query.filter_by(domain=domain).first():
        return jsonify({'error': 'domain_already_exists'}), 409

    web_root = str(Path(WEB_ROOT_BASE) / domain / 'public')
    site = Website(domain=domain, web_root=web_root, server_type=data['server_type'], status='running')
    db.session.add(site)
    db.session.commit()

    created, output = run_command(['bash', 'scripts/create_website.sh', domain, web_root])
    if not created:
        db.session.delete(site)
        db.session.commit()
        logger.exception('Website provisioning failed for domain=%s output=%s', domain, output)
        return jsonify({'error': 'provision_failed', 'details': output}), 500

    vhost_created, vhost_output = run_command(['bash', 'scripts/generate_vhost.sh', data['server_type'], domain, web_root])
    if not vhost_created:
        run_command(['bash', 'scripts/remove_website.sh', domain, web_root])
        db.session.delete(site)
        db.session.commit()
        logger.exception('Website vhost provisioning failed for domain=%s output=%s', domain, vhost_output)
        return jsonify({'error': 'vhost_provision_failed', 'details': vhost_output}), 500

    return jsonify({'id': site.id, 'domain': site.domain, 'web_root': site.web_root, 'status': site.status}), 201


@modules_bp.delete('/web/sites/<int:site_id>')
@jwt_required()
@require_roles('admin', 'reseller')
def remove_site(site_id: int):
    site = db.session.get(Website, site_id)
    if not site:
        return jsonify({'error': 'site_not_found'}), 404

    deleted, output = run_command(['bash', 'scripts/remove_website.sh', site.domain, site.web_root])
    if not deleted:
        logger.exception('Website remove failed for domain=%s output=%s', site.domain, output)
        return jsonify({'error': 'remove_failed', 'details': output}), 500

    db.session.delete(site)
    db.session.commit()
    return jsonify({'message': 'deleted'})


@modules_bp.post('/web/sites/<int:site_id>/start')
@jwt_required()
@require_roles('admin', 'reseller')
def start_site(site_id: int):
    site = db.session.get(Website, site_id)
    if not site:
        return jsonify({'error': 'site_not_found'}), 404

    ok, output = control_web_service('start', WEB_SERVICE_NAME)
    if not ok:
        logger.exception('Web service reload failed while starting site_id=%s output=%s', site_id, output)
        return jsonify({'error': 'service_reload_failed', 'details': output}), 500

    site.status = 'running'
    db.session.commit()
    return jsonify({'message': 'site_started', 'service_output': output})


@modules_bp.post('/web/sites/<int:site_id>/stop')
@jwt_required()
@require_roles('admin', 'reseller')
def stop_site(site_id: int):
    site = db.session.get(Website, site_id)
    if not site:
        return jsonify({'error': 'site_not_found'}), 404

    ok, output = control_web_service('stop', WEB_SERVICE_NAME)
    if not ok:
        logger.exception('Web service reload failed while stopping site_id=%s output=%s', site_id, output)
        return jsonify({'error': 'service_reload_failed', 'details': output}), 500

    site.status = 'stopped'
    db.session.commit()
    return jsonify({'message': 'site_stopped', 'service_output': output})


@modules_bp.get('/hosting/accounts')
@jwt_required()
def list_hosting_accounts():
    accounts = ManagedHostingAccount.query.order_by(ManagedHostingAccount.id.desc()).all()
    return jsonify(
        {
            'items': [
                {
                    'id': account.id,
                    'domain': account.domain,
                    'username': account.username,
                    'email': account.contact_email,
                    'package_name': account.package_name,
                    'select_options_manually': account.select_options_manually,
                    'server_type': account.server_type,
                    'cgi_access': account.cgi_access,
                    'cpanel_theme': account.cpanel_theme,
                    'locale': account.locale,
                    'enable_apache_spamassassin': account.enable_apache_spamassassin,
                    'enable_spam_box': account.enable_spam_box,
                    'mail_routing': account.mail_routing,
                    'shell_access': account.shell_access,
                    'dns_enabled': account.dns_enabled,
                    'web_root': account.web_root,
                    'home_directory': account.home_directory,
                    'status': account.status,
                    'created_at': account.created_at.isoformat(),
                }
                for account in accounts
            ]
        }
    )


@modules_bp.post('/hosting/accounts')
@jwt_required()
@require_roles('admin', 'reseller')
def create_hosting_account():
    payload = request.get_json(silent=True) or {}
    data, errors = validate_hosting_payload(HostingAccountCreateSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    if data['password'] != data['confirm_password']:
        return jsonify({'errors': {'confirm_password': ['passwords_do_not_match']}}), 400

    domain = data['domain'].strip().lower()
    username = data['username'].strip().lower()
    contact_email = data['email'].strip().lower()

    if Website.query.filter_by(domain=domain).first() or ManagedHostingAccount.query.filter_by(domain=domain).first():
        return jsonify({'error': 'domain_already_exists'}), 409
    if ManagedFTPAccount.query.filter_by(username=username).first() or ManagedHostingAccount.query.filter_by(username=username).first():
        return jsonify({'error': 'username_already_exists'}), 409

    web_root = str(Path(WEB_ROOT_BASE) / domain / 'public')
    home_directory = str(Path(WEB_ROOT_BASE) / domain)

    website = Website(domain=domain, web_root=web_root, server_type=data['server_type'], status='stopped')
    hosting_account = ManagedHostingAccount(
        domain=domain,
        username=username,
        contact_email=contact_email,
        package_name=data['package_name'],
        select_options_manually=data['select_options_manually'],
        server_type=data['server_type'],
        cgi_access=data['cgi_access'],
        cpanel_theme=data['cpanel_theme'],
        locale=data['locale'],
        enable_apache_spamassassin=data['enable_apache_spamassassin'],
        enable_spam_box=data['enable_spam_box'],
        mail_routing=data['mail_routing'],
        shell_access=data['shell_access'],
        dns_enabled=data['dns_enabled'],
        web_root=web_root,
        home_directory=home_directory,
        status='provisioning',
    )

    try:
        db.session.add_all([website, hosting_account])
        db.session.flush()
    except Exception:
        db.session.rollback()
        logger.exception('Hosting account database bootstrap failed for domain=%s username=%s', domain, username)
        return jsonify({'error': 'hosting_account_bootstrap_failed'}), 500

    created, output = run_command(['bash', 'scripts/create_website.sh', domain, web_root])
    if not created:
        db.session.rollback()
        logger.exception('Hosting account website provisioning failed for domain=%s output=%s', domain, output)
        return jsonify({'error': 'provision_failed', 'details': output}), 500

    vhost_created, vhost_output = run_command(['bash', 'scripts/generate_vhost.sh', data['server_type'], domain, web_root])
    if not vhost_created:
        run_command(['bash', 'scripts/remove_website.sh', domain, web_root])
        db.session.rollback()
        logger.exception('Hosting account vhost provisioning failed for domain=%s output=%s', domain, vhost_output)
        return jsonify({'error': 'vhost_provision_failed', 'details': vhost_output}), 500

    ftp_protocol = 'vsftpd'
    ftp_created, ftp_output = run_command(
        ['bash', 'scripts/ftp_user_create.sh', username, data['password'], ftp_protocol, home_directory, 'rw']
    )
    if not ftp_created:
        run_command(['bash', 'scripts/remove_website.sh', domain, web_root])
        db.session.rollback()
        logger.exception('Hosting account FTP provisioning failed for username=%s output=%s', username, ftp_output)
        return jsonify({'error': 'ftp_provision_failed', 'details': ftp_output}), 500

    ftp_account = ManagedFTPAccount(
        username=username,
        protocol=ftp_protocol,
        home_directory=home_directory,
        permissions='rw',
        is_enabled=True,
    )
    hosting_account.status = 'active'

    db.session.add(ftp_account)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        run_command(['bash', 'scripts/ftp_user_delete.sh', username, ftp_protocol, home_directory])
        run_command(['bash', 'scripts/remove_website.sh', domain, web_root])
        logger.exception('Hosting account commit failed for domain=%s username=%s', domain, username)
        return jsonify({'error': 'hosting_account_commit_failed'}), 500

    return (
        jsonify(
            {
                'id': hosting_account.id,
                'domain': hosting_account.domain,
                'username': hosting_account.username,
                'email': hosting_account.contact_email,
                'package_name': hosting_account.package_name,
                'select_options_manually': hosting_account.select_options_manually,
                'server_type': hosting_account.server_type,
                'status': hosting_account.status,
                'web_root': hosting_account.web_root,
                'home_directory': hosting_account.home_directory,
            }
        ),
        201,
    )


@modules_bp.delete('/hosting/accounts/<int:account_id>')
@jwt_required()
@require_roles('admin', 'reseller')
def delete_hosting_account(account_id: int):
    account = db.session.get(ManagedHostingAccount, account_id)
    if not account:
        return jsonify({'error': 'hosting_account_not_found'}), 404

    ftp_deleted, ftp_output = run_command(
        ['bash', 'scripts/ftp_user_delete.sh', account.username, 'vsftpd', account.home_directory]
    )
    if not ftp_deleted:
        logger.exception('Hosting account FTP removal failed username=%s output=%s', account.username, ftp_output)
        return jsonify({'error': 'ftp_delete_failed', 'details': ftp_output}), 500

    site_deleted, site_output = run_command(['bash', 'scripts/remove_website.sh', account.domain, account.web_root])
    if not site_deleted:
        logger.exception('Hosting account website removal failed domain=%s output=%s', account.domain, site_output)
        return jsonify({'error': 'website_delete_failed', 'details': site_output}), 500

    Website.query.filter_by(domain=account.domain).delete()
    ManagedFTPAccount.query.filter_by(username=account.username).delete()
    db.session.delete(account)
    db.session.commit()
    return jsonify({'message': 'deleted'})


@modules_bp.post('/web/vhosts/generate')
@jwt_required()
@require_roles('admin', 'reseller')
def generate_vhost():
    payload = request.get_json(silent=True) or {}
    site_id = payload.get('site_id')
    if not isinstance(site_id, int):
        return jsonify({'error': 'site_id_required'}), 400

    site = db.session.get(Website, site_id)
    if not site:
        return jsonify({'error': 'site_not_found'}), 404

    ok, output = run_command(['bash', 'scripts/generate_vhost.sh', site.server_type, site.domain, site.web_root])
    if not ok:
        logger.exception('Vhost generation failed for site_id=%s output=%s', site_id, output)
        return jsonify({'error': 'vhost_generation_failed', 'details': output}), 500

    return jsonify({'message': 'vhost_generated', 'details': output})


@modules_bp.post('/web/service/<string:action>')
@jwt_required()
@require_roles('admin')
def web_service_action(action: str):
    if action not in {'start', 'stop', 'restart'}:
        return jsonify({'error': 'invalid_action'}), 400

    ok, output = control_web_service(action, WEB_SERVICE_NAME)
    if not ok:
        logger.exception('Service action failed action=%s output=%s', action, output)
        return jsonify({'error': 'service_action_failed', 'details': output}), 500

    return jsonify({'message': f'service_{action}_ok', 'details': output})


@modules_bp.get('/databases')
@jwt_required()
def list_databases():
    databases = ManagedDatabase.query.order_by(ManagedDatabase.id.desc()).all()
    return jsonify({'items': [{'id': d.id, 'name': d.name, 'engine': d.engine, 'created_at': d.created_at.isoformat()} for d in databases]})


@modules_bp.post('/databases')
@jwt_required()
@require_roles('admin', 'reseller')
def create_database():
    payload = request.get_json(silent=True) or {}
    data, errors = validate_payload(DatabaseCreateSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    name = data['name']
    if ManagedDatabase.query.filter_by(name=name).first():
        return jsonify({'error': 'database_already_exists'}), 409

    created, output = run_command(
        [
            'bash',
            'scripts/db_create.sh',
            data['engine'],
            DB_ADMIN_USER,
            DB_ADMIN_PASSWORD,
            name,
        ]
    )
    if not created:
        logger.exception('Database create failed db=%s output=%s', name, output)
        return jsonify({'error': 'database_create_failed', 'details': output}), 500

    record = ManagedDatabase(name=name, engine=data['engine'])
    db.session.add(record)
    db.session.commit()

    return jsonify({'id': record.id, 'name': record.name, 'engine': record.engine}), 201


@modules_bp.delete('/databases/<int:database_id>')
@jwt_required()
@require_roles('admin', 'reseller')
def delete_database(database_id: int):
    record = db.session.get(ManagedDatabase, database_id)
    if not record:
        return jsonify({'error': 'database_not_found'}), 404

    deleted, output = run_command(
        [
            'bash',
            'scripts/db_delete.sh',
            record.engine,
            DB_ADMIN_USER,
            DB_ADMIN_PASSWORD,
            record.name,
        ]
    )
    if not deleted:
        logger.exception('Database delete failed db=%s output=%s', record.name, output)
        return jsonify({'error': 'database_delete_failed', 'details': output}), 500

    ManagedDatabaseGrant.query.filter_by(database_id=database_id).delete()
    db.session.delete(record)
    db.session.commit()
    return jsonify({'message': 'deleted'})


@modules_bp.get('/databases/users')
@jwt_required()
def list_database_users():
    users = ManagedDatabaseUser.query.order_by(ManagedDatabaseUser.id.desc()).all()
    return jsonify(
        {
            'items': [
                {'id': u.id, 'username': u.username, 'host': u.host, 'created_at': u.created_at.isoformat()}
                for u in users
            ]
        }
    )


@modules_bp.post('/databases/users')
@jwt_required()
@require_roles('admin', 'reseller')
def create_database_user():
    payload = request.get_json(silent=True) or {}
    data, errors = validate_payload(DatabaseUserCreateSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    if ManagedDatabaseUser.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'db_user_already_exists'}), 409

    created, output = run_command(
        [
            'bash',
            'scripts/db_user_create.sh',
            DB_ADMIN_USER,
            DB_ADMIN_PASSWORD,
            data['username'],
            data['password'],
            data['host'],
        ]
    )
    if not created:
        logger.exception('DB user create failed user=%s output=%s', data['username'], output)
        return jsonify({'error': 'db_user_create_failed', 'details': output}), 500

    user = ManagedDatabaseUser(username=data['username'], host=data['host'])
    db.session.add(user)
    db.session.commit()
    return jsonify({'id': user.id, 'username': user.username, 'host': user.host}), 201


@modules_bp.delete('/databases/users/<int:db_user_id>')
@jwt_required()
@require_roles('admin', 'reseller')
def delete_database_user(db_user_id: int):
    user = db.session.get(ManagedDatabaseUser, db_user_id)
    if not user:
        return jsonify({'error': 'db_user_not_found'}), 404

    deleted, output = run_command(
        ['bash', 'scripts/db_user_delete.sh', DB_ADMIN_USER, DB_ADMIN_PASSWORD, user.username, user.host]
    )
    if not deleted:
        logger.exception('DB user delete failed user=%s output=%s', user.username, output)
        return jsonify({'error': 'db_user_delete_failed', 'details': output}), 500

    ManagedDatabaseGrant.query.filter_by(db_user_id=db_user_id).delete()
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'deleted'})


@modules_bp.post('/databases/grants')
@jwt_required()
@require_roles('admin', 'reseller')
def grant_database_permissions():
    payload = request.get_json(silent=True) or {}
    data, errors = validate_payload(GrantPrivilegesSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    db_record = db.session.get(ManagedDatabase, data['database_id'])
    db_user = db.session.get(ManagedDatabaseUser, data['db_user_id'])
    if not db_record or not db_user:
        return jsonify({'error': 'database_or_user_not_found'}), 404

    granted, output = run_command(
        [
            'bash',
            'scripts/db_grant.sh',
            DB_ADMIN_USER,
            DB_ADMIN_PASSWORD,
            db_record.name,
            db_user.username,
            db_user.host,
            data['privileges'],
        ]
    )
    if not granted:
        logger.exception(
            'DB grant failed db=%s user=%s output=%s',
            db_record.name,
            db_user.username,
            output,
        )
        return jsonify({'error': 'grant_failed', 'details': output}), 500

    grant = ManagedDatabaseGrant.query.filter_by(database_id=db_record.id, db_user_id=db_user.id).first()
    if grant:
        grant.privileges = data['privileges']
    else:
        grant = ManagedDatabaseGrant(database_id=db_record.id, db_user_id=db_user.id, privileges=data['privileges'])
        db.session.add(grant)

    db.session.commit()
    return jsonify({'message': 'granted', 'grant_id': grant.id})


@modules_bp.get('/databases/grants')
@jwt_required()
def list_database_grants():
    grants = ManagedDatabaseGrant.query.order_by(ManagedDatabaseGrant.id.desc()).all()
    items = []
    for g in grants:
        db_record = db.session.get(ManagedDatabase, g.database_id)
        db_user = db.session.get(ManagedDatabaseUser, g.db_user_id)
        if not db_record or not db_user:
            continue
        items.append(
            {
                'id': g.id,
                'database_id': db_record.id,
                'database_name': db_record.name,
                'db_user_id': db_user.id,
                'username': db_user.username,
                'host': db_user.host,
                'privileges': g.privileges,
                'created_at': g.created_at.isoformat(),
            }
        )
    return jsonify({'items': items})


@modules_bp.get('/emails/accounts')
@jwt_required()
def list_email_accounts():
    domain = (request.args.get('domain') or '').strip().lower()
    query = ManagedEmailAccount.query
    if domain:
        query = query.filter_by(domain=domain)

    accounts = query.order_by(ManagedEmailAccount.id.desc()).all()
    return jsonify(
        {
            'items': [
                {
                    'id': account.id,
                    'domain': account.domain,
                    'local_part': account.local_part,
                    'email': account.email,
                    'mailbox_path': account.mailbox_path,
                    'is_enabled': account.is_enabled,
                    'created_at': account.created_at.isoformat(),
                }
                for account in accounts
            ]
        }
    )


@modules_bp.post('/emails/accounts')
@jwt_required()
@require_roles('admin', 'reseller')
def create_email_account():
    payload = request.get_json(silent=True) or {}
    data, errors = validate_email_payload(EmailAccountCreateSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    domain = data['domain'].strip().lower()
    local_part = data['local_part'].strip().lower()
    if not is_valid_domain(domain):
        return jsonify({'errors': {'domain': ['invalid_domain_format']}}), 400

    email = f'{local_part}@{domain}'
    if ManagedEmailAccount.query.filter_by(email=email).first():
        return jsonify({'error': 'email_account_already_exists'}), 409

    mailbox_path = str(Path(MAIL_BASE_DIR) / domain / local_part)
    created, output = run_command(['bash', 'scripts/email_create.sh', domain, local_part, data['password']])
    if not created:
        logger.exception('Email create failed account=%s output=%s', email, output)
        return jsonify({'error': 'email_create_failed', 'details': output}), 500

    account = ManagedEmailAccount(
        domain=domain,
        local_part=local_part,
        email=email,
        mailbox_path=mailbox_path,
        is_enabled=True,
    )
    db.session.add(account)
    db.session.commit()
    return jsonify({'id': account.id, 'email': account.email, 'is_enabled': account.is_enabled}), 201


@modules_bp.delete('/emails/accounts/<int:account_id>')
@jwt_required()
@require_roles('admin', 'reseller')
def delete_email_account(account_id: int):
    account = db.session.get(ManagedEmailAccount, account_id)
    if not account:
        return jsonify({'error': 'email_account_not_found'}), 404

    deleted, output = run_command(['bash', 'scripts/email_delete.sh', account.domain, account.local_part])
    if not deleted:
        logger.exception('Email delete failed account=%s output=%s', account.email, output)
        return jsonify({'error': 'email_delete_failed', 'details': output}), 500

    db.session.delete(account)
    db.session.commit()
    return jsonify({'message': 'deleted'})


@modules_bp.patch('/emails/accounts/<int:account_id>/status')
@jwt_required()
@require_roles('admin', 'reseller')
def set_email_account_status(account_id: int):
    payload = request.get_json(silent=True) or {}
    data, errors = validate_email_payload(EmailAccountStatusSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    account = db.session.get(ManagedEmailAccount, account_id)
    if not account:
        return jsonify({'error': 'email_account_not_found'}), 404

    enabled_flag = '1' if data['enabled'] else '0'
    ok, output = run_command(['bash', 'scripts/email_set_status.sh', account.domain, account.local_part, enabled_flag])
    if not ok:
        logger.exception('Email status update failed account=%s output=%s', account.email, output)
        return jsonify({'error': 'email_status_update_failed', 'details': output}), 500

    account.is_enabled = data['enabled']
    db.session.commit()
    return jsonify({'id': account.id, 'email': account.email, 'is_enabled': account.is_enabled})


@modules_bp.patch('/emails/accounts/<int:account_id>/password')
@jwt_required()
@require_roles('admin', 'reseller')
def set_email_account_password(account_id: int):
    payload = request.get_json(silent=True) or {}
    data, errors = validate_email_payload(EmailPasswordUpdateSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    account = db.session.get(ManagedEmailAccount, account_id)
    if not account:
        return jsonify({'error': 'email_account_not_found'}), 404

    ok, output = run_command(['bash', 'scripts/email_set_password.sh', account.domain, account.local_part, data['password']])
    if not ok:
        logger.exception('Email password update failed account=%s output=%s', account.email, output)
        return jsonify({'error': 'email_password_update_failed', 'details': output}), 500

    return jsonify({'message': 'password_updated', 'email': account.email})


@modules_bp.get('/dns/zones')
@jwt_required()
def list_dns_zones():
    zones = ManagedDNSZone.query.order_by(ManagedDNSZone.id.desc()).all()
    return jsonify(
        {
            'items': [
                {
                    'id': zone.id,
                    'domain': zone.domain,
                    'provider': zone.provider,
                    'is_active': zone.is_active,
                    'created_at': zone.created_at.isoformat(),
                }
                for zone in zones
            ]
        }
    )


@modules_bp.post('/dns/zones')
@jwt_required()
@require_roles('admin', 'reseller')
def create_dns_zone():
    payload = request.get_json(silent=True) or {}
    data, errors = validate_dns_payload(DNSZoneCreateSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    domain = data['domain'].strip().lower()
    if not is_valid_domain(domain):
        return jsonify({'errors': {'domain': ['invalid_domain_format']}}), 400
    if ManagedDNSZone.query.filter_by(domain=domain).first():
        return jsonify({'error': 'dns_zone_already_exists'}), 409

    ok, output = run_command(['bash', 'scripts/dns_zone_create.sh', data['provider'], domain])
    if not ok:
        logger.exception('DNS zone create failed domain=%s output=%s', domain, output)
        return jsonify({'error': 'dns_zone_create_failed', 'details': output}), 500

    zone = ManagedDNSZone(domain=domain, provider=data['provider'], is_active=True)
    db.session.add(zone)
    db.session.commit()
    return jsonify({'id': zone.id, 'domain': zone.domain, 'provider': zone.provider}), 201


@modules_bp.delete('/dns/zones/<int:zone_id>')
@jwt_required()
@require_roles('admin', 'reseller')
def delete_dns_zone(zone_id: int):
    zone = db.session.get(ManagedDNSZone, zone_id)
    if not zone:
        return jsonify({'error': 'dns_zone_not_found'}), 404

    ok, output = run_command(['bash', 'scripts/dns_zone_delete.sh', zone.provider, zone.domain])
    if not ok:
        logger.exception('DNS zone delete failed zone=%s output=%s', zone.domain, output)
        return jsonify({'error': 'dns_zone_delete_failed', 'details': output}), 500

    ManagedDNSRecord.query.filter_by(zone_id=zone.id).delete()
    db.session.delete(zone)
    db.session.commit()
    return jsonify({'message': 'deleted'})


@modules_bp.get('/dns/records')
@jwt_required()
def list_dns_records():
    zone_id = request.args.get('zone_id', type=int)
    query = ManagedDNSRecord.query
    if zone_id:
        query = query.filter_by(zone_id=zone_id)
    records = query.order_by(ManagedDNSRecord.id.desc()).all()
    return jsonify(
        {
            'items': [
                {
                    'id': rec.id,
                    'zone_id': rec.zone_id,
                    'name': rec.name,
                    'record_type': rec.record_type,
                    'value': rec.value,
                    'ttl': rec.ttl,
                    'priority': rec.priority,
                    'created_at': rec.created_at.isoformat(),
                }
                for rec in records
            ]
        }
    )


@modules_bp.post('/dns/records')
@jwt_required()
@require_roles('admin', 'reseller')
def create_dns_record():
    payload = request.get_json(silent=True) or {}
    data, errors = validate_dns_payload(DNSRecordCreateSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    zone = db.session.get(ManagedDNSZone, data['zone_id'])
    if not zone:
        return jsonify({'error': 'dns_zone_not_found'}), 404

    if data['record_type'] == 'MX' and data.get('priority') is None:
        return jsonify({'errors': {'priority': ['priority_required_for_mx']}}), 400
    if data['record_type'] != 'MX' and data.get('priority') is not None:
        return jsonify({'errors': {'priority': ['priority_only_allowed_for_mx']}}), 400
    if not _is_valid_dns_record_value(data['record_type'], data['value']):
        return jsonify({'errors': {'value': ['invalid_record_value']}}), 400

    ok, output = run_command(
        [
            'bash',
            'scripts/dns_record_apply.sh',
            'add',
            zone.provider,
            zone.domain,
            data['name'],
            data['record_type'],
            data['value'],
            str(data['ttl']),
            '' if data.get('priority') is None else str(data['priority']),
        ]
    )
    if not ok:
        logger.exception('DNS record add failed zone=%s output=%s', zone.domain, output)
        return jsonify({'error': 'dns_record_create_failed', 'details': output}), 500

    rec = ManagedDNSRecord(
        zone_id=zone.id,
        name=data['name'],
        record_type=data['record_type'],
        value=data['value'],
        ttl=data['ttl'],
        priority=data.get('priority'),
    )
    db.session.add(rec)
    db.session.commit()
    return jsonify({'id': rec.id, 'zone_id': rec.zone_id}), 201


@modules_bp.patch('/dns/records/<int:record_id>')
@jwt_required()
@require_roles('admin', 'reseller')
def update_dns_record(record_id: int):
    payload = request.get_json(silent=True) or {}
    data, errors = validate_dns_payload(DNSRecordUpdateSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    if not data:
        return jsonify({'error': 'empty_payload'}), 400

    rec = db.session.get(ManagedDNSRecord, record_id)
    if not rec:
        return jsonify({'error': 'dns_record_not_found'}), 404
    zone = db.session.get(ManagedDNSZone, rec.zone_id)
    if not zone:
        return jsonify({'error': 'dns_zone_not_found'}), 404

    new_name = data.get('name', rec.name)
    new_value = data.get('value', rec.value)
    new_ttl = data.get('ttl', rec.ttl)
    new_priority = data.get('priority', rec.priority)

    if rec.record_type == 'MX' and new_priority is None:
        return jsonify({'errors': {'priority': ['priority_required_for_mx']}}), 400
    if rec.record_type != 'MX' and new_priority is not None:
        return jsonify({'errors': {'priority': ['priority_only_allowed_for_mx']}}), 400
    if not _is_valid_dns_record_value(rec.record_type, new_value):
        return jsonify({'errors': {'value': ['invalid_record_value']}}), 400

    ok, output = run_command(
        [
            'bash',
            'scripts/dns_record_apply.sh',
            'update',
            zone.provider,
            zone.domain,
            new_name,
            rec.record_type,
            new_value,
            str(new_ttl),
            '' if new_priority is None else str(new_priority),
        ]
    )
    if not ok:
        logger.exception('DNS record update failed record=%s output=%s', rec.id, output)
        return jsonify({'error': 'dns_record_update_failed', 'details': output}), 500

    rec.name = new_name
    rec.value = new_value
    rec.ttl = new_ttl
    rec.priority = new_priority
    db.session.commit()
    return jsonify({'id': rec.id, 'zone_id': rec.zone_id})


@modules_bp.delete('/dns/records/<int:record_id>')
@jwt_required()
@require_roles('admin', 'reseller')
def delete_dns_record(record_id: int):
    rec = db.session.get(ManagedDNSRecord, record_id)
    if not rec:
        return jsonify({'error': 'dns_record_not_found'}), 404
    zone = db.session.get(ManagedDNSZone, rec.zone_id)
    if not zone:
        return jsonify({'error': 'dns_zone_not_found'}), 404

    ok, output = run_command(
        [
            'bash',
            'scripts/dns_record_apply.sh',
            'delete',
            zone.provider,
            zone.domain,
            rec.name,
            rec.record_type,
            rec.value,
            str(rec.ttl),
            '' if rec.priority is None else str(rec.priority),
        ]
    )
    if not ok:
        logger.exception('DNS record delete failed record=%s output=%s', rec.id, output)
        return jsonify({'error': 'dns_record_delete_failed', 'details': output}), 500

    db.session.delete(rec)
    db.session.commit()
    return jsonify({'message': 'deleted'})


@modules_bp.get('/ftp/accounts')
@jwt_required()
def list_ftp_accounts():
    accounts = ManagedFTPAccount.query.order_by(ManagedFTPAccount.id.desc()).all()
    return jsonify(
        {
            'items': [
                {
                    'id': acc.id,
                    'username': acc.username,
                    'protocol': acc.protocol,
                    'home_directory': acc.home_directory,
                    'permissions': acc.permissions,
                    'is_enabled': acc.is_enabled,
                    'created_at': acc.created_at.isoformat(),
                }
                for acc in accounts
            ]
        }
    )


@modules_bp.post('/ftp/accounts')
@jwt_required()
@require_roles('admin', 'reseller')
def create_ftp_account():
    payload = request.get_json(silent=True) or {}
    data, errors = validate_ftp_payload(FTPAccountCreateSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    if ManagedFTPAccount.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'ftp_account_already_exists'}), 409
    if not data['home_directory'].startswith('/'):
        return jsonify({'errors': {'home_directory': ['absolute_path_required']}}), 400

    ok, output = run_command(
        [
            'bash',
            'scripts/ftp_user_create.sh',
            data['username'],
            data['password'],
            data['protocol'],
            data['home_directory'],
            data['permissions'],
        ]
    )
    if not ok:
        logger.exception('FTP create failed user=%s output=%s', data['username'], output)
        return jsonify({'error': 'ftp_account_create_failed', 'details': output}), 500

    account = ManagedFTPAccount(
        username=data['username'],
        protocol=data['protocol'],
        home_directory=data['home_directory'],
        permissions=data['permissions'],
        is_enabled=True,
    )
    db.session.add(account)
    db.session.commit()
    return jsonify({'id': account.id, 'username': account.username}), 201


@modules_bp.patch('/ftp/accounts/<int:account_id>')
@jwt_required()
@require_roles('admin', 'reseller')
def update_ftp_account(account_id: int):
    payload = request.get_json(silent=True) or {}
    data, errors = validate_ftp_payload(FTPAccountUpdateSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400
    if not data:
        return jsonify({'error': 'empty_payload'}), 400

    account = db.session.get(ManagedFTPAccount, account_id)
    if not account:
        return jsonify({'error': 'ftp_account_not_found'}), 404

    new_home = data.get('home_directory', account.home_directory)
    new_perm = data.get('permissions', account.permissions)
    if not new_home.startswith('/'):
        return jsonify({'errors': {'home_directory': ['absolute_path_required']}}), 400

    ok, output = run_command(['bash', 'scripts/ftp_user_permissions.sh', account.username, new_home, new_perm])
    if not ok:
        logger.exception('FTP permissions update failed user=%s output=%s', account.username, output)
        return jsonify({'error': 'ftp_account_update_failed', 'details': output}), 500

    account.home_directory = new_home
    account.permissions = new_perm
    db.session.commit()
    return jsonify({'id': account.id, 'username': account.username, 'home_directory': account.home_directory, 'permissions': account.permissions})


@modules_bp.delete('/ftp/accounts/<int:account_id>')
@jwt_required()
@require_roles('admin', 'reseller')
def delete_ftp_account(account_id: int):
    account = db.session.get(ManagedFTPAccount, account_id)
    if not account:
        return jsonify({'error': 'ftp_account_not_found'}), 404

    ok, output = run_command(['bash', 'scripts/ftp_user_delete.sh', account.username, account.protocol, account.home_directory])
    if not ok:
        logger.exception('FTP delete failed user=%s output=%s', account.username, output)
        return jsonify({'error': 'ftp_account_delete_failed', 'details': output}), 500

    db.session.delete(account)
    db.session.commit()
    return jsonify({'message': 'deleted'})


@modules_bp.get('/backups')
@jwt_required()
@require_roles('admin', 'reseller')
def list_backups():
    backups = ManagedBackup.query.order_by(ManagedBackup.id.desc()).all()
    return jsonify(
        {
            'items': [
                {
                    'id': item.id,
                    'backup_name': item.backup_name,
                    'backup_path': item.backup_path,
                    'backup_type': item.backup_type,
                    'status': item.status,
                    'size_bytes': item.size_bytes,
                    'created_at': item.created_at.isoformat(),
                }
                for item in backups
            ]
        }
    )


@modules_bp.post('/backups/run')
@jwt_required()
@require_roles('admin', 'reseller')
def run_backup():
    payload = request.get_json(silent=True) or {}
    data, errors = validate_backup_payload(BackupRunSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    ok, output = run_command(['bash', 'scripts/backup_run.sh'])
    if not ok:
        logger.exception('Backup run failed output=%s', output)
        return jsonify({'error': 'backup_run_failed', 'details': output}), 500

    metadata = {}
    for line in output.splitlines():
        if '=' in line:
            key, value = line.split('=', 1)
            metadata[key.strip()] = value.strip()

    # Support mocked command output in development/test environments.
    if not metadata and output.startswith('MOCK:'):
        now = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        metadata = {
            'BACKUP_NAME': f'takepanel_full_{now}.tar.gz',
            'BACKUP_PATH': f'{BACKUP_BASE_DIR}/takepanel_full_{now}.tar.gz',
            'SIZE_BYTES': '0',
        }

    backup_name = metadata.get('BACKUP_NAME')
    backup_path = metadata.get('BACKUP_PATH')
    size_raw = metadata.get('SIZE_BYTES', '0')
    try:
        size_bytes = int(size_raw)
    except ValueError:
        size_bytes = 0

    if not backup_name or not backup_path:
        logger.exception('Backup output parse failed output=%s', output)
        return jsonify({'error': 'backup_metadata_parse_failed', 'details': output}), 500

    backup = ManagedBackup(
        backup_name=backup_name,
        backup_path=backup_path,
        backup_type=data.get('backup_type', 'full'),
        status='completed',
        size_bytes=size_bytes,
    )
    db.session.add(backup)
    db.session.commit()
    return jsonify({'id': backup.id, 'backup_name': backup.backup_name, 'size_bytes': backup.size_bytes}), 201


@modules_bp.post('/backups/restore')
@jwt_required()
@require_roles('admin')
def restore_backup():
    payload = request.get_json(silent=True) or {}
    data, errors = validate_backup_payload(BackupRestoreSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    backup = db.session.get(ManagedBackup, data['backup_id'])
    if not backup:
        return jsonify({'error': 'backup_not_found'}), 404

    ok, output = run_command(['bash', 'scripts/backup_restore.sh', backup.backup_path])
    if not ok:
        logger.exception('Backup restore failed backup_id=%s output=%s', backup.id, output)
        return jsonify({'error': 'backup_restore_failed', 'details': output}), 500

    return jsonify({'message': 'restore_completed', 'backup_id': backup.id})


@modules_bp.get('/backups/schedule')
@jwt_required()
@require_roles('admin', 'reseller')
def get_backup_schedule():
    schedule = BackupSchedule.query.order_by(BackupSchedule.id.desc()).first()
    if not schedule:
        return jsonify({'item': None})
    return jsonify(
        {
            'item': {
                'id': schedule.id,
                'cron_expression': schedule.cron_expression,
                'is_enabled': schedule.is_enabled,
                'updated_at': schedule.updated_at.isoformat(),
            }
        }
    )


@modules_bp.post('/backups/schedule')
@jwt_required()
@require_roles('admin')
def set_backup_schedule():
    payload = request.get_json(silent=True) or {}
    data, errors = validate_backup_payload(BackupScheduleSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    cron_expression = data['cron_expression'].strip()
    if len(cron_expression.split()) != 5:
        return jsonify({'errors': {'cron_expression': ['cron_expression_must_have_5_fields']}}), 400

    runner_path = str(Path(__file__).resolve().parents[3] / 'scripts' / 'backup_run.sh')
    ok, output = run_command(['bash', 'scripts/backup_schedule.sh', cron_expression, runner_path])
    if not ok:
        logger.exception('Backup schedule update failed output=%s', output)
        return jsonify({'error': 'backup_schedule_failed', 'details': output}), 500

    schedule = BackupSchedule.query.order_by(BackupSchedule.id.desc()).first()
    if not schedule:
        schedule = BackupSchedule(cron_expression=cron_expression, is_enabled=data['is_enabled'])
        db.session.add(schedule)
    else:
        schedule.cron_expression = cron_expression
        schedule.is_enabled = data['is_enabled']
        schedule.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({'message': 'schedule_updated', 'cron_expression': schedule.cron_expression})


@modules_bp.get('/monitoring/metrics')
@jwt_required()
def monitoring_metrics():
    thresholds_payload = {
        'cpu': request.args.get('cpu', default=85, type=float),
        'ram': request.args.get('ram', default=85, type=float),
        'disk': request.args.get('disk', default=90, type=float),
        'network_mbps': request.args.get('network_mbps', default=500, type=float),
    }
    thresholds, errors = validate_monitoring_payload(MonitoringThresholdSchema, thresholds_payload)
    if errors:
        return jsonify({'errors': errors}), 400

    metrics, raw_output = _collect_metrics()
    alerts = []
    if metrics['cpu'] >= thresholds['cpu']:
        alerts.append({'severity': 'high', 'metric': 'cpu', 'value': metrics['cpu'], 'threshold': thresholds['cpu']})
    if metrics['ram'] >= thresholds['ram']:
        alerts.append({'severity': 'high', 'metric': 'ram', 'value': metrics['ram'], 'threshold': thresholds['ram']})
    if metrics['disk'] >= thresholds['disk']:
        alerts.append({'severity': 'high', 'metric': 'disk', 'value': metrics['disk'], 'threshold': thresholds['disk']})
    if metrics['network']['in_mbps'] >= thresholds['network_mbps'] or metrics['network']['out_mbps'] >= thresholds['network_mbps']:
        alerts.append(
            {
                'severity': 'medium',
                'metric': 'network',
                'value': metrics['network'],
                'threshold': thresholds['network_mbps'],
            }
        )

    return jsonify({'metrics': metrics, 'alerts': alerts, 'thresholds': thresholds, 'source': raw_output})


@modules_bp.post('/security/firewall/apply')
@jwt_required()
@require_roles('admin')
def apply_firewall():
    ok, output = run_command(['bash', 'scripts/security_firewall.sh'])
    if not ok:
        logger.exception('Firewall apply failed output=%s', output)
        return jsonify({'error': 'firewall_apply_failed', 'details': output}), 500
    return jsonify({'message': 'firewall_applied', 'details': output})


@modules_bp.post('/security/fail2ban/apply')
@jwt_required()
@require_roles('admin')
def apply_fail2ban():
    ok, output = run_command(['bash', 'scripts/security_fail2ban.sh'])
    if not ok:
        logger.exception('Fail2Ban apply failed output=%s', output)
        return jsonify({'error': 'fail2ban_apply_failed', 'details': output}), 500
    return jsonify({'message': 'fail2ban_applied', 'details': output})


@modules_bp.post('/security/ssl/setup')
@jwt_required()
@require_roles('admin')
def setup_ssl():
    payload = request.get_json(silent=True) or {}
    data, errors = validate_monitoring_payload(SSLSetupSchema, payload)
    if errors:
        return jsonify({'errors': errors}), 400

    domain = data['domain'].strip().lower()
    if not is_valid_domain(domain):
        return jsonify({'errors': {'domain': ['invalid_domain_format']}}), 400

    ok, output = run_command(['bash', 'scripts/security_ssl_setup.sh', domain, data['email']])
    if not ok:
        logger.exception('SSL setup failed domain=%s output=%s', domain, output)
        return jsonify({'error': 'ssl_setup_failed', 'details': output}), 500
    return jsonify({'message': 'ssl_setup_completed', 'details': output})
