from flask import Blueprint, jsonify
from ..models import db, User, Book, BookCopy, ExchangeListing, Category

stats_bp = Blueprint('stats', __name__, url_prefix='/api/stats')

@stats_bp.route('/public', methods=['GET'])
def get_public_stats():
    total_books = Book.query.count()
    total_copies = BookCopy.query.count()
    available_copies = BookCopy.query.filter_by(status='available').count()
    registered_members = User.query.count()
    completed_exchanges = ExchangeListing.query.filter_by(status='exchanged').count()
    
    # Recently added books (last 6)
    recent_books = Book.query.order_by(Book.created_at.desc()).limit(6).all()
    
    # Recommended / popular books (e.g. books with multiple copies or ordered)
    popular_books = Book.query.order_by(Book.id.asc()).limit(6).all()
    
    categories = Category.query.all()
    
    return jsonify({
        'success': True,
        'stats': {
            'total_books': total_books,
            'total_copies': total_copies,
            'available_copies': available_copies,
            'available_books': available_copies,
            'registered_members': registered_members,
            'total_members': registered_members,
            'completed_exchanges': completed_exchanges,
            'total_exchanges': completed_exchanges
        },
        'recent_books': [b.to_dict() for b in recent_books],
        'popular_books': [b.to_dict() for b in popular_books],
        'categories': [c.to_dict() for c in categories]
    })
