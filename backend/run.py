import click

from app import create_app
from app.extensions import db

app = create_app()


@app.cli.command('bootstrap-admin')
@click.option('--email', default='admin@takepanel.local', show_default=True, help='Admin email to create/update.')
@click.option('--password', default='ChangeMe123!', show_default=True, help='Admin password.')
@click.option('--reset-password', is_flag=True, help='Force password reset for existing admin user.')
def bootstrap_admin(email: str, password: str, reset_password: bool) -> None:
    """Create DB tables and ensure an admin user exists."""
    import app.models  # noqa: F401
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


@app.cli.command('seed-admin')
def seed_admin_compat() -> None:
    """Backward-compatible alias for legacy scripts."""
    bootstrap_admin('admin@takepanel.local', 'ChangeMe123!', False)
