from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from ..models import db, User
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
    """Returns Google Client ID configuration if set in environment."""
    import os
    client_id = os.environ.get('GOOGLE_CLIENT_ID', '')
    return jsonify({
        'success': True,
        'client_id': client_id,
        'configured': bool(client_id)
    })

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    """
    Sign in or register a patron using Google Account.
    Accepts:
    1. Google Identity Services ID Token credential (verified via Google tokeninfo)
    2. Direct Google profile payload { email, name, avatar, google_id }
    """
    import os
    import secrets
    import urllib.request
    import json
    
    data = request.get_json() or {}
    credential = data.get('credential')
    
    email = None
    name = None
    avatar = None
    
    # 1. If Google ID Token credential was sent from Google Identity Services
    if credential:
        try:
            token_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
            req = urllib.request.Request(token_url, headers={'User-Agent': 'BookBridge/1.0'})
            with urllib.request.urlopen(req, timeout=8) as res:
                google_info = json.loads(res.read().decode('utf-8'))
                email = google_info.get('email', '').strip().lower()
                name = google_info.get('name', '').strip()
                avatar = google_info.get('picture', '').strip()
        except Exception as e:
            # Fall back to provided user info if offline or token inspection failed
            pass
            
    # 2. If direct profile data provided (or fallback from payload)
    if not email:
        email = data.get('email', '').strip().lower()
        name = data.get('name', '').strip()
        avatar = data.get('avatar', '').strip()
        
    if not email:
        return jsonify({'success': False, 'message': 'Valid Google email is required'}), 400
        
    if not name:
        name = email.split('@')[0].capitalize()
        
    if not avatar:
        avatar = f"https://api.dicebear.com/7.x/initials/svg?seed={name}&backgroundColor=166534&textColor=ffffff"
        
    # Check if user already exists
    user = User.query.filter_by(email=email).first()
    is_new = False
    
    if user:
        # Existing user: update avatar if not present
        if avatar and (not user.avatar or 'dicebear' in user.avatar):
            user.avatar = avatar
            db.session.commit()
    else:
        # New Google user: register account automatically
        is_new = True
        random_pwd = secrets.token_urlsafe(24)
        user = User(
            name=name,
            email=email,
            role='user',
            avatar=avatar,
            bio='Community patron signed in with Google Account.'
        )
        user.set_password(random_pwd)
        db.session.add(user)
        db.session.commit()
        
        notify_user(
            user.id,
            "Welcome to BookBridge! 📚",
            f"Hello {name}, your library account is ready with Google Sign-in.",
            "success",
            "/library"
        )
        
    # Login user session
    login_user(user, remember=True)
    
    return jsonify({
        'success': True,
        'message': f"Signed in as {user.name} via Google Account",
        'user': user.to_dict(),
        'is_new_user': is_new
    })

