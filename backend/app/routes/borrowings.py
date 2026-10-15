from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime, timezone, timedelta
from ..models import db, Book, BookCopy, BorrowingRequest, BorrowingTransaction
from ..utils import admin_required, notify_user

borrowings_bp = Blueprint('borrowings', __name__, url_prefix='/api/borrowings')

@borrowings_bp.route('', methods=['GET'])
@borrowings_bp.route('/transactions', methods=['GET'])
@borrowings_bp.route('/my', methods=['GET'])
@login_required
def get_transactions():
    """Get borrowing transactions. Admins can view all; patrons view their own."""
    status_filter = request.args.get('status')
    is_my_endpoint = request.path.endswith('/my')
    
    if current_user.is_admin and not is_my_endpoint and request.args.get('all', '').lower() in ['true', '1']:
        query = BorrowingTransaction.query
    else:
        query = BorrowingTransaction.query.filter_by(user_id=current_user.id)
        
    if status_filter:
        query = query.filter(BorrowingTransaction.status == status_filter)
        
    txs = query.order_by(BorrowingTransaction.borrow_date.desc()).all()
    return jsonify({
        'success': True,
        'transactions': [t.to_dict() for t in txs]
    })

@borrowings_bp.route('/requests', methods=['GET'])
@borrowings_bp.route('/requests/my', methods=['GET'])
@login_required
def get_requests():
    """Get borrow requests."""
    status_filter = request.args.get('status')
    is_my_endpoint = request.path.endswith('/my')
    
    if current_user.is_admin and not is_my_endpoint and request.args.get('all', '').lower() in ['true', '1']:
        query = BorrowingRequest.query
    elif current_user.is_admin and not is_my_endpoint:
        query = BorrowingRequest.query
    else:
        query = BorrowingRequest.query.filter_by(user_id=current_user.id)
        
    if status_filter:
        query = query.filter(BorrowingRequest.status == status_filter)
        
    reqs = query.order_by(BorrowingRequest.request_date.desc()).all()
    return jsonify({
        'success': True,
        'requests': [r.to_dict() for r in reqs]
    })

@borrowings_bp.route('/request', methods=['POST'])
@borrowings_bp.route('/requests', methods=['POST'])
@login_required
def request_borrow():
    """Create a new borrowing request."""
    data = request.get_json() or {}
    book_id = data.get('book_id')
    book_copy_id = data.get('book_copy_id')
    raw_duration = data.get('requested_duration_days') or data.get('duration_days') or 14
    duration_days = min(60, max(1, int(raw_duration)))
    
    # Resolve book and copy
    copy = None
    if book_copy_id:
        copy = db.session.get(BookCopy, int(book_copy_id))
        if not copy:
            return jsonify({'success': False, 'message': 'Specified book copy was not found'}), 404
        book_id = copy.book_id
        
    if not book_id:
        return jsonify({'success': False, 'message': 'Book ID or Book Copy ID is required'}), 400
        
    book = db.session.get(Book, int(book_id))
    if not book:
        return jsonify({'success': False, 'message': 'Book was not found in catalog'}), 404
        
    # Check if user already has an active borrow or pending request for this book
    existing_pending = BorrowingRequest.query.join(BookCopy).filter(
        BorrowingRequest.user_id == current_user.id,
        BorrowingRequest.status == 'pending',
        BookCopy.book_id == book.id
    ).first()
    if existing_pending:
        return jsonify({'success': False, 'message': 'You already have a pending borrow request for this book'}), 400
        
    existing_active = BorrowingTransaction.query.join(BookCopy).filter(
        BorrowingTransaction.user_id == current_user.id,
        BorrowingTransaction.status.in_(['active', 'return_pending', 'overdue']),
        BookCopy.book_id == book.id
    ).first()
    if existing_active:
        return jsonify({'success': False, 'message': 'You currently have an active borrowed copy of this book'}), 400
        
    # If specific copy chosen, verify availability; otherwise pick first available copy
    if copy:
        if copy.status != 'available':
            return jsonify({'success': False, 'message': f'Copy {copy.copy_number} is currently {copy.status}'}), 400
    else:
        copy = BookCopy.query.filter_by(book_id=book.id, status='available').first()
        if not copy:
            return jsonify({'success': False, 'message': 'No copies of this book are currently available for borrowing'}), 400
            
    # Mark copy as reserved while pending review
    copy.status = 'reserved'
    
    req = BorrowingRequest(
        user_id=current_user.id,
        book_copy_id=copy.id,
        requested_duration_days=duration_days,
        status='pending'
    )
    db.session.add(req)
    db.session.commit()
    
    notify_user(
        current_user.id,
        "Borrow Request Submitted 📖",
        f"Your request to borrow '{book.title}' for {duration_days} days was received. Pending librarian approval.",
        "info",
        "/profile?tab=borrowing"
    )
    
    return jsonify({
        'success': True,
        'message': f"Borrow request for '{book.title}' submitted successfully",
        'request': req.to_dict()
    }), 201

@borrowings_bp.route('/requests/<int:request_id>/approve', methods=['POST'])
@borrowings_bp.route('/requests/<int:request_id>/review', methods=['PATCH'])
@admin_required
def approve_borrow_request(request_id):
    """Approve or review a borrowing request."""
    req = db.session.get(BorrowingRequest, request_id)
    if not req:
        return jsonify({'success': False, 'message': 'Borrow request not found'}), 404
        
    data = request.get_json(silent=True) or {}
    # If called via /approve route directly, default status is 'approved'
    status = data.get('status', 'approved')
    admin_notes = data.get('admin_notes', 'Approved by librarian').strip()
    
    if req.status != 'pending':
        return jsonify({'success': False, 'message': f'Request already {req.status}'}), 400
        
    req.status = status
    req.admin_notes = admin_notes
    req.reviewed_at = datetime.now(timezone.utc)
    
    book_title = req.book_copy.book.title if req.book_copy and req.book_copy.book else 'Book'
    
    if status == 'approved':
        req.book_copy.status = 'borrowed'
        now = datetime.now(timezone.utc)
        due = now + timedelta(days=req.requested_duration_days)
        
        tx = BorrowingTransaction(
            user_id=req.user_id,
            book_copy_id=req.book_copy_id,
            request_id=req.id,
            borrow_date=now,
            due_date=due,
            status='active'
        )
        db.session.add(tx)
        
        notify_user(
            req.user_id,
            "Borrow Request Approved! 📚",
            f"Your loan for '{book_title}' is approved! Due date: {due.strftime('%b %d, %Y')}.",
            "success",
            "/profile?tab=borrowing"
        )
    else:
        if req.book_copy and req.book_copy.status == 'reserved':
            req.book_copy.status = 'available'
            
        notify_user(
            req.user_id,
            "Borrow Request Declined",
            f"Your request for '{book_title}' could not be fulfilled. Note: {admin_notes}",
            "warning",
            "/library"
        )
        
    db.session.commit()
    return jsonify({
        'success': True,
        'message': f"Request {status} successfully",
        'request': req.to_dict()
    })

@borrowings_bp.route('/requests/<int:request_id>/reject', methods=['POST'])
@admin_required
def reject_borrow_request(request_id):
    """Reject a borrowing request."""
    req = db.session.get(BorrowingRequest, request_id)
    if not req:
        return jsonify({'success': False, 'message': 'Borrow request not found'}), 404
        
    data = request.get_json(silent=True) or {}
    admin_notes = data.get('admin_notes', 'Declined by library administrator').strip()
    
    if req.status != 'pending':
        return jsonify({'success': False, 'message': f'Request already {req.status}'}), 400
        
    req.status = 'rejected'
    req.admin_notes = admin_notes
    req.reviewed_at = datetime.now(timezone.utc)
    
    if req.book_copy and req.book_copy.status == 'reserved':
        req.book_copy.status = 'available'
        
    book_title = req.book_copy.book.title if req.book_copy and req.book_copy.book else 'Book'
    notify_user(
        req.user_id,
        "Borrow Request Declined",
        f"Your request for '{book_title}' was declined: {admin_notes}",
        "warning",
        "/library"
    )
    
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Request rejected',
        'request': req.to_dict()
    })

@borrowings_bp.route('/requests/<int:request_id>/cancel', methods=['POST'])
@login_required
def cancel_request(request_id):
    """Cancel a pending borrow request."""
    req = db.session.get(BorrowingRequest, request_id)
    if not req:
        return jsonify({'success': False, 'message': 'Request not found'}), 404
        
    if req.user_id != current_user.id and not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
    if req.status != 'pending':
        return jsonify({'success': False, 'message': 'Can only cancel pending requests'}), 400
        
    req.status = 'cancelled'
    if req.book_copy and req.book_copy.status == 'reserved':
        req.book_copy.status = 'available'
        
    db.session.commit()
    return jsonify({'success': True, 'message': 'Borrowing request cancelled'})
