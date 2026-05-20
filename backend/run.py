from app import create_app
from app.extensions import db

app = create_app()


@app.cli.command('seed-admin')
def seed_admin() -> None:
    """Create default admin user for development."""
    from app.models.user import User

    email = 'admin@takepanel.local'
    password = 'ChangeMe123!'

    existing = User.query.filter_by(email=email).first()
    if existing:
        print('Admin user already exists.')
        return

    admin = User(email=email, role='admin')
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()
    print(f'Created admin user: {email} / {password}')
