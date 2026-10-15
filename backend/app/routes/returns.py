from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime, timezone
from ..models import db, BorrowingTransaction, ReturnRequest, BookCopy
from ..utils import admin_required, notify_user

returns_bp = Blueprint('returns', __name__, url_prefix='/api/returns')

@returns_bp.route('', methods=['GET'])
@returns_bp.route('/requests', methods=['GET'])
@login_required
def get_return_requests():
    """Get return requests. Admins view all; patrons view their own."""
    status_filter = request.args.get('status')
    
    if current_user.is_admin:
        query = ReturnRequest.query
    else:
        query = ReturnRequest.query.filter_by(user_id=current_user.id)
        
    if status_filter:
        query = query.filter_by(status=status_filter)
        
    requests = query.order_by(ReturnRequest.request_date.desc()).all()
    return jsonify({
        'success': True,
        'return_requests': [r.to_dict() for r in requests]
    })

@returns_bp.route('/request', methods=['POST'])
@login_required
def submit_return():
    """Submit a book return request for an active loan."""
    data = request.get_json() or {}
    transaction_id = data.get('transaction_id')
    condition_notes = data.get('condition_notes', 'Returned in good shape.').strip()
    
    if not transaction_id:
        return jsonify({'success': False, 'message': 'Transaction ID is required'}), 400
        
    tx = db.session.get(BorrowingTransaction, int(transaction_id))
    if not tx:
        return jsonify({'success': False, 'message': 'Borrowing record not found'}), 404
        
    if tx.user_id != current_user.id and not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
    if tx.status == 'returned':
        return jsonify({'success': False, 'message': 'This book is already recorded as returned'}), 400
        
    existing = ReturnRequest.query.filter_by(transaction_id=tx.id, status='pending').first()
    if existing:
        return jsonify({'success': False, 'message': 'A return check-in request is already pending for this loan'}), 400
        
    tx.status = 'return_pending'
    return_req = ReturnRequest(
        transaction_id=tx.id,
        user_id=current_user.id,
        condition_notes=condition_notes,
        status='pending'
    )
    db.session.add(return_req)
    db.session.commit()
    
    notify_user(
        current_user.id,
        "Return Queued for Check-in 📦",
        "Your book return request was received. Physical check-in pending librarian confirmation.",
        "info",
        "/profile?tab=borrowing"
    )
    
    return jsonify({
        'success': True,
        'message': 'Return request submitted successfully',
        'return_request': return_req.to_dict()
    }), 201

@returns_bp.route('/<int:return_id>/confirm', methods=['POST'])
@returns_bp.route('/confirm/<int:return_id>', methods=['POST'])
@admin_required
def confirm_return(return_id):
    """Librarian confirmation of returned physical book copy."""
    return_req = db.session.get(ReturnRequest, return_id)
    if not return_req:
        return jsonify({'success': False, 'message': 'Return request not found'}), 404
        
    if return_req.status != 'pending':
        return jsonify({'success': False, 'message': f'Return request already {return_req.status}'}), 400
        
    now = datetime.now(timezone.utc)
    return_req.status = 'confirmed'
    return_req.confirmed_at = now
    
    tx = return_req.transaction
    if tx:
        tx.status = 'returned'
        tx.returned_date = now
        
        # Free up the physical book copy back to available circulation
        if tx.book_copy:
            tx.book_copy.status = 'available'
            
        book_title = tx.book_copy.book.title if tx.book_copy and tx.book_copy.book else 'Volume'
        notify_user(
            return_req.user_id,
            "Return Confirmed! ✅",
            f"Your return of '{book_title}' has been inspected and cataloged back into the stacks. Thank you!",
            "success",
            "/profile?tab=history"
        )
        
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Return confirmed and physical copy placed back in circulation',
        'return_request': return_req.to_dict()
    })

@returns_bp.route('/<int:return_id>/reject', methods=['POST'])
@admin_required
def reject_return(return_id):
    """Reject a return request."""
    return_req = db.session.get(ReturnRequest, return_id)
    if not return_req:
        return jsonify({'success': False, 'message': 'Return request not found'}), 404
        
    return_req.status = 'rejected'
    if return_req.transaction and return_req.transaction.status == 'return_pending':
        return_req.transaction.status = 'active'
        
    notify_user(
        return_req.user_id,
        "Return Inspection Notice",
        "There was an issue processing your return check-in. Please visit the circulation desk.",
        "danger",
        "/profile?tab=borrowing"
    )
    
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Return request rejected',
        'return_request': return_req.to_dict()
    })
