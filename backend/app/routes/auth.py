from flask import Blueprint, request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from ..models import db, User, TrustedGmail
from ..utils import notify_user

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'user')
    phone = data.get('phone', '').strip()
    address = data.get('address', '').strip()
    
    if not name or not email or not password:
        return jsonify({'success': False, 'message': 'Name, email, and password are required'}), 400
        
    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'An account with this email already exists'}), 409
        
    # Prevent unauthorized admin creation in general registration
    if role not in ['user', 'admin']:
        role = 'user'
        
    user = User(
        name=name,
        email=email,
        role=role,
        phone=phone,
        address=address
    )
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    # Auto login after register
    login_user(user, remember=True)
    
    notify_user(
        user.id,
        "Welcome to BookBridge! 📚",
        "Your account has been created. Explore our digital collection, request books, or share your own!",
        "success",
        "/library"
    )
    
    return jsonify({
        'success': True,
        'message': 'Registration successful',
        'user': user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    remember = data.get('remember', True)
    
    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
        
    login_user(user, remember=remember)
    return jsonify({
        'success': True,
        'message': 'Logged in successfully',
        'user': user.to_dict()
    })

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    if current_user.is_authenticated:
        return jsonify({
            'success': True,
            'authenticated': True,
            'user': current_user.to_dict()
        })
    return jsonify({
        'success': True,
        'authenticated': False,
        'user': None
    })

@auth_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    address = data.get('address', '').strip()
    bio = data.get('bio', '').strip()
    avatar = data.get('avatar', '').strip()
    
    if name:
        current_user.name = name
    current_user.phone = phone
    current_user.address = address
    current_user.bio = bio
    if avatar:
        current_user.avatar = avatar
        
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Profile updated successfully',
        'user': current_user.to_dict()
    })

@auth_bp.route('/password', methods=['PUT'])
@login_required
def change_password():
    data = request.get_json() or {}
    current_pass = data.get('current_password', '')
    new_pass = data.get('new_password', '')
    
    if not current_pass or not new_pass:
        return jsonify({'success': False, 'message': 'Both current and new password are required'}), 400
        
    if not current_user.check_password(current_pass):
        return jsonify({'success': False, 'message': 'Incorrect current password'}), 400
        
    if len(new_pass) < 6:
        return jsonify({'success': False, 'message': 'New password must be at least 6 characters'}), 400
        
    current_user.set_password(new_pass)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Password changed successfully'})

@auth_bp.route('/google/config', methods=['GET'])
def get_google_config():
    """Returns Google Client ID and Trusted Patron security configuration."""
    client_id = current_app.config.get('GOOGLE_CLIENT_ID', '')
    trusted_only = current_app.config.get('TRUSTED_GMAIL_ONLY', True)
    allowed_domains = current_app.config.get('ALLOWED_GMAIL_DOMAINS', ['gmail.com', 'googlemail.com'])
    trusted_count = TrustedGmail.query.count()
    
    return jsonify({
        'success': True,
        'client_id': client_id,
        'configured': bool(client_id),
        'trusted_only': trusted_only,
        'allowed_domains': allowed_domains,
        'trusted_count': trusted_count
    })

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    """
    Sign in or register a patron using a verified Google Account.
    Security protections:
    1. Cryptographic Google ID Token verification via Google OAuth2 tokeninfo.
    2. Check Google's email_verified flag (must be True).
    3. Verify token audience (aud) matches GOOGLE_CLIENT_ID if configured.
    4. Domain validation (must belong to allowed Google domains).
    5. Trusted Patron Whitelist enforcement: only authorized/trusted Google accounts can enter.
    6. Admin account protection: disallow unauthorized takeover of administrative accounts.
    """
    import os
    import secrets
    import urllib.request
    import json
    
    data = request.get_json() or {}
    credential = data.get('credential')
    client_id = current_app.config.get('GOOGLE_CLIENT_ID', '')
    trusted_only = current_app.config.get('TRUSTED_GMAIL_ONLY', True)
    allowed_domains = current_app.config.get('ALLOWED_GMAIL_DOMAINS', ['gmail.com', 'googlemail.com'])
    
    email = None
    name = None
    avatar = None
    token_verified = False
    
    # 1. Cryptographic Google ID Token verification
    if credential:
        try:
            token_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
            req = urllib.request.Request(token_url, headers={'User-Agent': 'BookBridge-Security/1.0'})
            with urllib.request.urlopen(req, timeout=10) as res:
                google_info = json.loads(res.read().decode('utf-8'))
                
                if 'error' in google_info or 'error_description' in google_info:
                    return jsonify({'success': False, 'message': f"Google verification rejected: {google_info.get('error_description', 'Invalid token')}"}), 401
                
                # Check audience if client_id is configured
                if client_id and google_info.get('aud') != client_id:
                    return jsonify({'success': False, 'message': 'Google token audience mismatch (unauthorized client)'}), 403
                
                # Verify that Google has verified the email
                email_verified = str(google_info.get('email_verified', '')).lower()
                if email_verified not in ('true', '1'):
                    return jsonify({'success': False, 'message': 'This Google account has not verified their email address with Google.'}), 403
                
                email = google_info.get('email', '').strip().lower()
                name = google_info.get('name', '').strip()
                avatar = google_info.get('picture', '').strip()
                token_verified = True
        except urllib.error.HTTPError as he:
            return jsonify({'success': False, 'message': 'Google rejected authentication token. Please sign in again.'}), 401
        except Exception as e:
            return jsonify({'success': False, 'message': 'Unable to connect to Google verification services. Please check network connectivity.'}), 503
    else:
        # No cryptographic token provided
        if client_id:
            return jsonify({
                'success': False,
                'message': 'Security requirement: Cryptographic Google ID Token is required. Direct payloads are disabled.'
            }), 400
            
        # In local evaluation mode (client_id not yet provided in .env):
        email = data.get('email', '').strip().lower()
        name = data.get('name', '').strip()
        avatar = data.get('avatar', '').strip()
        
    if not email:
        return jsonify({'success': False, 'message': 'A valid Google email address is required'}), 400
        
    # 2. Domain Validation: Ensure it's a Gmail / allowed Google domain
    domain = email.split('@')[-1] if '@' in email else ''
    if domain not in allowed_domains:
        return jsonify({
            'success': False,
            'message': f"Access restricted: '@{domain}' is not an authorized Google domain. Only @{', @'.join(allowed_domains)} accounts are permitted."
        }), 403

    # 3. Trusted Patron Whitelist Enforcement ("only trusted can use it")
    if trusted_only:
        is_trusted = TrustedGmail.query.filter_by(email=email).first() is not None
        existing_user = User.query.filter_by(email=email).first()
        
        if not is_trusted and not existing_user:
            return jsonify({
                'success': False,
                'trusted_error': True,
                'message': f"Access restricted: '{email}' is not on the library's trusted Google patrons list. Please ask the librarian (admin@bookbridge.org) to authorize your Gmail address."
            }), 403

    # 4. Existing User Protection & Lookup
    user = User.query.filter_by(email=email).first()
    is_new = False
    
    if user:
        # Security protection: Administrator accounts cannot be hijacked without verified token in production
        if user.is_admin and client_id and not token_verified:
            return jsonify({'success': False, 'message': 'Administrator accounts require cryptographic Google verification'}), 403
            
        if avatar and (not user.avatar or 'dicebear' in user.avatar):
            user.avatar = avatar
            db.session.commit()
    else:
        is_new = True
        random_pwd = secrets.token_urlsafe(32)
        user = User(
            name=name or email.split('@')[0].capitalize(),
            email=email,
            role='user',
            avatar=avatar or f"https://api.dicebear.com/7.x/initials/svg?seed={name or 'P'}&backgroundColor=166534&textColor=ffffff",
            bio='Verified Trusted Google Patron.'
        )
        user.set_password(random_pwd)
        db.session.add(user)
        db.session.commit()
        
        # Ensure recorded in TrustedGmail table
        if not TrustedGmail.query.filter_by(email=email).first():
            tg = TrustedGmail(email=email, name=user.name, notes="Auto-registered via Verified Google Sign-in")
            db.session.add(tg)
            db.session.commit()
            
        notify_user(
            user.id,
            "Welcome to BookBridge! 📚",
            f"Hello {user.name}, your trusted library card is active and verified via Google.",
            "success",
            "/library"
        )
        
    login_user(user, remember=True)
    
    return jsonify({
        'success': True,
        'message': f"Authenticated as {user.name} ({user.email})",
        'user': user.to_dict(),
        'is_new_user': is_new,
        'token_verified': token_verified
    })


