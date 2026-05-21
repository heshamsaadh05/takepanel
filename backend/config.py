import os


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-change-me')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-change-me')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///takepanel.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    TAKEPANEL_BOOTSTRAP_DB_ON_START = os.getenv('TAKEPANEL_BOOTSTRAP_DB_ON_START', 'true').lower() == 'true'
    TAKEPANEL_ADMIN_EMAIL = os.getenv('TAKEPANEL_ADMIN_EMAIL', 'admin@takepanel.local')
    TAKEPANEL_ADMIN_PASSWORD = os.getenv('TAKEPANEL_ADMIN_PASSWORD', 'ChangeMe123!')
