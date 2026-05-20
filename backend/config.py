import os


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-change-me')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-change-me')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///takepanel.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
