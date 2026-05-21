import os


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-change-me')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-change-me')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///takepanel.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    TAKEPANEL_BOOTSTRAP_DB_ON_START = os.getenv('TAKEPANEL_BOOTSTRAP_DB_ON_START', 'true').lower() == 'true'
    TAKEPANEL_ADMIN_EMAIL = os.getenv('TAKEPANEL_ADMIN_EMAIL', 'owner@takepanel.local')
    TAKEPANEL_ADMIN_PASSWORD = os.getenv('TAKEPANEL_ADMIN_PASSWORD', 'TakePanel@2026!')
    TAKEPANEL_SYSTEM_AUTH_ENABLED = os.getenv('TAKEPANEL_SYSTEM_AUTH_ENABLED', 'true').lower() == 'true'
    TAKEPANEL_SYSTEM_ADMIN_USERS = {
        u.strip().lower()
        for u in os.getenv('TAKEPANEL_SYSTEM_ADMIN_USERS', 'root').split(',')
        if u.strip()
    }
