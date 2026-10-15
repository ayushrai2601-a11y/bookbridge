from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime, timezone
from ..models import db, Donation, Book, BookCopy, Category
from ..utils import admin_required, notify_user

donations_bp = Blueprint('donations', __name__, url_prefix='/api/donations')

@donations_bp.route('', methods=['GET'])
@donations_bp.route('/my', methods=['GET'])
@login_required
def get_donations():
    """Get donations list. Admins can view all; patrons view their own."""
    status_filter = request.args.get('status')
    is_my_endpoint = request.path.endswith('/my')
    
    if current_user.is_admin and not is_my_endpoint:
        query = Donation.query
    else:
        query = Donation.query.filter_by(user_id=current_user.id)
        
    if status_filter:
        query = query.filter_by(status=status_filter)
        
    donations = query.order_by(Donation.created_at.desc()).all()
    return jsonify({
        'success': True,
        'donations': [d.to_dict() for d in donations]
    })

@donations_bp.route('', methods=['POST'])
@login_required
def create_donation():
    """Submit a book donation."""
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    author = data.get('author', '').strip()
    category_name = data.get('category_name', 'General').strip()
    condition = data.get('condition', 'Good').strip()
    description = data.get('description', '').strip()
    cover_image = data.get('cover_image', '').strip()
    
    if not title or not author:
        return jsonify({'success': False, 'message': 'Book title and author are required'}), 400
        
    donation = Donation(
        user_id=current_user.id,
        title=title,
        author=author,
        category_name=category_name,
        condition=condition,
        description=description,
        cover_image=cover_image or 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
        status='pending'
    )
    
    db.session.add(donation)
    db.session.commit()
    
    notify_user(
        current_user.id,
        "Donation Submitted! 🎁",
        f"Thank you for donating '{title}'. Our librarians will review and catalog it.",
        "info",
        "/profile?tab=donations"
    )
    
    return jsonify({
        'success': True,
        'message': 'Book donation submitted for approval',
        'donation': donation.to_dict()
    }), 201

@donations_bp.route('/<int:donation_id>/approve', methods=['POST'])
@admin_required
def approve_donation(donation_id):
    """Approve donation and catalog book + copy into SQLite database."""
    donation = db.session.get(Donation, donation_id)
    if not donation:
        return jsonify({'success': False, 'message': 'Donation record not found'}), 404
        
    data = request.get_json(silent=True) or {}
    admin_notes = data.get('admin_notes', 'Approved and cataloged into public stacks').strip()
    
    donation.status = 'approved'
    donation.admin_notes = admin_notes
    donation.reviewed_at = datetime.now(timezone.utc)
    
    # Ensure category exists in database
    category = Category.query.filter_by(name=donation.category_name).first()
    if not category:
        category = Category(
            name=donation.category_name,
            slug=donation.category_name.lower().replace(' ', '-').replace('&', 'and'),
            description=f'Books in {donation.category_name}'
        )
        db.session.add(category)
        db.session.flush()
        
    # Check if book title + author already exists in catalog
    book = Book.query.filter_by(title=donation.title, author=donation.author).first()
    if not book:
        book = Book(
            title=donation.title,
            author=donation.author,
            category_id=category.id,
            description=donation.description or f'Community donated copy by {donation.donor.name if donation.donor else "Patron"}.',
            cover_image=donation.cover_image,
            publisher='Community Circulation'
        )
        db.session.add(book)
        db.session.flush()
        
    # Add physical copy
    copy_count = len(book.copies) + 1
    copy = BookCopy(
        book_id=book.id,
        copy_number=f"BK-{book.id:04d}-C{copy_count}",
        condition=donation.condition,
        status='available'
    )
    db.session.add(copy)
    donation.book_id = book.id
    
    notify_user(
        donation.user_id,
        "Donation Cataloged! 🎉",
        f"Your donation of '{donation.title}' is now in public circulation (Copy #{copy.copy_number})!",
        "success",
        f"/library/{book.id}"
    )
    
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Donation approved and book added to catalog',
        'donation': donation.to_dict()
    })

@donations_bp.route('/<int:donation_id>/reject', methods=['POST'])
@admin_required
def reject_donation(donation_id):
    """Reject a donation."""
    donation = db.session.get(Donation, donation_id)
    if not donation:
        return jsonify({'success': False, 'message': 'Donation record not found'}), 404
        
    data = request.get_json(silent=True) or {}
    admin_notes = data.get('admin_notes', 'Thank you, but this title does not currently fit library acquisition requirements.').strip()
    
    donation.status = 'rejected'
    donation.admin_notes = admin_notes
    donation.reviewed_at = datetime.now(timezone.utc)
    
    notify_user(
        donation.user_id,
        "Donation Update",
        f"Your donation of '{donation.title}' could not be accepted. Note: {admin_notes}",
        "warning",
        "/profile?tab=donations"
    )
    
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Donation rejected',
        'donation': donation.to_dict()
    })

@donations_bp.route('/<int:donation_id>/status', methods=['PATCH'])
@admin_required
def review_donation(donation_id):
    """Compatibility endpoint for status update."""
    data = request.get_json() or {}
    status = data.get('status')
    if status == 'approved':
        return approve_donation(donation_id)
    elif status == 'rejected':
        return reject_donation(donation_id)
    return jsonify({'success': False, 'message': 'Invalid status'}), 400
