from functools import wraps
from flask import jsonify
from flask_login import current_user
from .models import db, Notification

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        if current_user.role != 'admin':
            return jsonify({'success': False, 'message': 'Admin privilege required'}), 403
        return f(*args, **kwargs)
    return decorated_function

def notify_user(user_id, title, message, notif_type='info', link=None):
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notif_type,
            link=link
        )
        db.session.add(notif)
        db.session.commit()
        return notif
    except Exception as e:
        db.session.rollback()
        print(f"Failed to create notification: {e}")
        return None
