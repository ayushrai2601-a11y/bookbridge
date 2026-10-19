import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'bookbridge-dev-secret-key-change-in-production-2026')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', f'sqlite:///{os.path.join(BASE_DIR, "bookbridge.db")}')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Session / Cookie settings
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
    
    # Google OAuth & Trusted Patrons Security
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
    TRUSTED_GMAIL_ONLY = os.environ.get('TRUSTED_GMAIL_ONLY', 'true').lower() in ('true', '1')
    ALLOWED_GMAIL_DOMAINS = [d.strip().lower() for d in os.environ.get('ALLOWED_GMAIL_DOMAINS', 'gmail.com,googlemail.com').split(',') if d.strip()]

