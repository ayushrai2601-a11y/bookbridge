from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import or_
from ..models import db, ExchangeListing, ExchangeRequest
from ..utils import notify_user

exchanges_bp = Blueprint('exchanges', __name__, url_prefix='/api/exchanges')

@exchanges_bp.route('/listings', methods=['GET'])
def get_listings():
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    status = request.args.get('status', 'available')  # 'available', 'all', 'mine'
    
    query = ExchangeListing.query
    
    if status == 'mine':
        if not current_user.is_authenticated:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        query = query.filter_by(user_id=current_user.id)
    elif status != 'all':
        query = query.filter_by(status='available')
        
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                ExchangeListing.title.ilike(s),
                ExchangeListing.author.ilike(s),
                ExchangeListing.looking_for.ilike(s),
                ExchangeListing.description.ilike(s)
            )
        )
        
    if category and category != 'all':
        query = query.filter(ExchangeListing.category.ilike(category))
        
    listings = query.order_by(ExchangeListing.created_at.desc()).all()
    return jsonify({
        'success': True,
        'listings': [l.to_dict() for l in listings]
    })

@exchanges_bp.route('/my', methods=['GET'])
@login_required
def get_my_exchanges_overview():
    """Returns both user's listings and exchange requests in one payload for profile."""
    listings = ExchangeListing.query.filter_by(user_id=current_user.id).order_by(ExchangeListing.created_at.desc()).all()
    requests = ExchangeRequest.query.filter_by(proposer_id=current_user.id).order_by(ExchangeRequest.created_at.desc()).all()
    return jsonify({
        'success': True,
        'listings': [l.to_dict(include_requests=True) for l in listings],
        'requests': [r.to_dict() for r in requests]
    })

@exchanges_bp.route('/listings/<int:listing_id>', methods=['GET'])
def get_listing(listing_id):
    listing = db.session.get(ExchangeListing, listing_id)
    if not listing:
        return jsonify({'success': False, 'message': 'Listing not found'}), 404
    is_owner = current_user.is_authenticated and current_user.id == listing.user_id
    return jsonify({
        'success': True,
        'listing': listing.to_dict(include_requests=is_owner)
    })

@exchanges_bp.route('/listings', methods=['POST'])
@login_required
def create_listing():
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    author = data.get('author', '').strip()
    category = data.get('category', 'Fiction').strip()
    condition = data.get('condition', 'Good').strip()
    description = data.get('description', '').strip()
    cover_image = data.get('cover_image', '').strip()
    looking_for = data.get('looking_for', '').strip()
    
    if not title or not author:
        return jsonify({'success': False, 'message': 'Title and author are required'}), 400
        
    listing = ExchangeListing(
        user_id=current_user.id,
        title=title,
        author=author,
        category=category,
        condition=condition,
        description=description,
        cover_image=cover_image or 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600',
        looking_for=looking_for or 'Any good literature',
        status='available'
    )
    db.session.add(listing)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Exchange listing created successfully',
        'listing': listing.to_dict()
    }), 201

@exchanges_bp.route('/request', methods=['POST'])
@exchanges_bp.route('/requests', methods=['POST'])
@login_required
def create_request():
    data = request.get_json() or {}
    listing_id = data.get('listing_id')
    offered_title = data.get('offered_title', '').strip()
    offered_author = data.get('offered_author', '').strip()
    offered_condition = data.get('offered_condition', 'Good').strip()
    message = data.get('message', '').strip()
    
    if not listing_id or not offered_title or not offered_author:
        return jsonify({'success': False, 'message': 'Listing ID, offered book title and author are required'}), 400
        
    listing = db.session.get(ExchangeListing, int(listing_id))
    if not listing:
        return jsonify({'success': False, 'message': 'Exchange listing was not found'}), 404
        
    if listing.user_id == current_user.id:
        return jsonify({'success': False, 'message': 'You cannot make an exchange offer on your own listing'}), 400
        
    if listing.status != 'available':
        return jsonify({'success': False, 'message': 'This listing is no longer available for exchange'}), 400
        
    # Check duplicate pending request
    existing = ExchangeRequest.query.filter_by(
        listing_id=listing.id,
        proposer_id=current_user.id,
        status='pending'
    ).first()
    if existing:
        return jsonify({'success': False, 'message': 'You already have an active pending proposal on this listing'}), 400
        
    req = ExchangeRequest(
        listing_id=listing.id,
        proposer_id=current_user.id,
        offered_title=offered_title,
        offered_author=offered_author,
        offered_condition=offered_condition,
        message=message,
        status='pending'
    )
    db.session.add(req)
    db.session.commit()
    
    notify_user(
        listing.user_id,
        "New Exchange Proposal! 🔄",
        f"{current_user.name} offered '{offered_title}' for your book '{listing.title}'.",
        "info",
        "/profile?tab=exchanges"
    )
    
    return jsonify({
        'success': True,
        'message': 'Exchange proposal submitted successfully',
        'request': req.to_dict()
    }), 201

@exchanges_bp.route('/requests', methods=['GET'])
@login_required
def get_all_exchange_requests():
    """Get all requests, filtered by status if provided."""
    status = request.args.get('status')
    query = ExchangeRequest.query
    if status:
        query = query.filter_by(status=status)
    requests = query.order_by(ExchangeRequest.created_at.desc()).all()
    return jsonify({
        'success': True,
        'requests': [r.to_dict() for r in requests]
    })

@exchanges_bp.route('/requests/my', methods=['GET'])
@login_required
def get_my_exchange_requests():
    incoming = ExchangeRequest.query.join(ExchangeListing).filter(
        ExchangeListing.user_id == current_user.id
    ).order_by(ExchangeRequest.created_at.desc()).all()
    
    outgoing = ExchangeRequest.query.filter_by(
        proposer_id=current_user.id
    ).order_by(ExchangeRequest.created_at.desc()).all()
    
    return jsonify({
        'success': True,
        'incoming': [r.to_dict() for r in incoming],
        'outgoing': [r.to_dict() for r in outgoing]
    })

@exchanges_bp.route('/requests/<int:request_id>/accept', methods=['POST'])
@login_required
def accept_request(request_id):
    req = db.session.get(ExchangeRequest, request_id)
    if not req:
        return jsonify({'success': False, 'message': 'Request not found'}), 404
        
    listing = req.listing
    if listing.user_id != current_user.id and not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
    if req.status != 'pending':
        return jsonify({'success': False, 'message': f'Request already {req.status}'}), 400
        
    req.status = 'accepted'
    listing.status = 'exchanged'
    
    # Reject conflicting requests on the same listing
    other_requests = ExchangeRequest.query.filter(
        ExchangeRequest.listing_id == listing.id,
        ExchangeRequest.id != req.id,
        ExchangeRequest.status == 'pending'
    ).all()
    for other in other_requests:
        other.status = 'rejected'
        notify_user(
            other.proposer_id,
            "Exchange Closed",
            f"The listing for '{listing.title}' was completed with another trade partner.",
            "warning",
            "/exchanges"
        )
        
    notify_user(
        req.proposer_id,
        "Exchange Accepted! 🎉",
        f"Your offer for '{listing.title}' was accepted by {current_user.name}! Contact: {current_user.email}.",
        "success",
        "/profile?tab=exchanges"
    )
    
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Exchange accepted successfully',
        'request': req.to_dict()
    })

@exchanges_bp.route('/requests/<int:request_id>/reject', methods=['POST'])
@login_required
def reject_request(request_id):
    req = db.session.get(ExchangeRequest, request_id)
    if not req:
        return jsonify({'success': False, 'message': 'Request not found'}), 404
        
    listing = req.listing
    if listing.user_id != current_user.id and not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
    req.status = 'rejected'
    notify_user(
        req.proposer_id,
        "Exchange Offer Declined",
        f"Your offer for '{listing.title}' was declined.",
        "info",
        "/exchanges"
    )
    
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Exchange request rejected',
        'request': req.to_dict()
    })

@exchanges_bp.route('/requests/<int:request_id>/cancel', methods=['POST'])
@login_required
def cancel_request(request_id):
    req = db.session.get(ExchangeRequest, request_id)
    if not req:
        return jsonify({'success': False, 'message': 'Request not found'}), 404
    if req.proposer_id != current_user.id and not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    req.status = 'cancelled'
    db.session.commit()
    return jsonify({'success': True, 'message': 'Exchange request cancelled'})
