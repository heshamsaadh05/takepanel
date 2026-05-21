import click
from importlib import import_module

from app import create_app
from app.extensions import db

app = create_app()


def _bootstrap_admin_impl(email: str, password: str, reset_password: bool) -> None:
    """Create DB tables and ensure an admin user exists."""
    import_module('app.models')
    from app.models.user import User

    db.create_all()
    email = email.lower()

    existing = User.query.filter_by(email=email).first()
    if existing:
        existing.is_active = True
        existing.role = 'admin'
        if reset_password:
            existing.set_password(password)
        db.session.commit()
        if reset_password:
            print(f'Admin user password reset: {email}')
        else:
            print(f'Admin user already exists: {email}')
        return

    admin = User(email=email, role='admin')
    admin.set_password(password)
    admin.is_active = True
    db.session.add(admin)
    db.session.commit()
    print(f'Created admin user: {email} / {password}')


@app.cli.command('bootstrap-admin')
@click.option('--email', default='owner@takepanel.local', show_default=True, help='Admin email to create/update.')
@click.option('--password', default='TakePanel@2026!', show_default=True, help='Admin password.')
@click.option('--reset-password', is_flag=True, help='Force password reset for existing admin user.')
def bootstrap_admin(email: str, password: str, reset_password: bool) -> None:
    _bootstrap_admin_impl(email, password, reset_password)


@app.cli.command('seed-admin')
def seed_admin_compat() -> None:
    """Backward-compatible alias for legacy scripts."""
    _bootstrap_admin_impl('owner@takepanel.local', 'TakePanel@2026!', False)
