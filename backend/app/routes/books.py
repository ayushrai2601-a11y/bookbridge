from flask import Blueprint, request, jsonify
from flask_login import login_required
from sqlalchemy import or_
from ..models import db, Book, BookCopy, Category
from ..utils import admin_required

books_bp = Blueprint('books', __name__, url_prefix='/api/books')

@books_bp.route('', methods=['GET'])
def get_books():
    search = request.args.get('search', '').strip()
    category_id = request.args.get('category_id', type=int)
    category_slug = request.args.get('category', '').strip()
    available_only = request.args.get('available', '').lower() in ['true', '1']
    sort_by = request.args.get('sort_by', 'newest')  # newest, title, author, copies
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    
    query = Book.query
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Book.title.ilike(search_term),
                Book.author.ilike(search_term),
                Book.isbn.ilike(search_term),
                Book.description.ilike(search_term)
            )
        )
        
    if category_id:
        query = query.filter(Book.category_id == category_id)
    elif category_slug and category_slug != 'all':
        category = Category.query.filter_by(slug=category_slug).first()
        if category:
            query = query.filter(Book.category_id == category.id)
            
    if available_only:
        query = query.join(BookCopy).filter(BookCopy.status == 'available').distinct()
        
    if sort_by == 'title':
        query = query.order_by(Book.title.asc())
    elif sort_by == 'author':
        query = query.order_by(Book.author.asc())
    else:  # newest
        query = query.order_by(Book.created_at.desc())
        
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'success': True,
        'books': [b.to_dict() for b in paginated.items],
        'pagination': {
            'page': paginated.page,
            'per_page': paginated.per_page,
            'total_items': paginated.total,
            'total_pages': paginated.pages,
            'has_next': paginated.has_next,
            'has_prev': paginated.has_prev
        }
    })

@books_bp.route('/<int:book_id>', methods=['GET'])
def get_book(book_id):
    book = Book.query.get_or_404(book_id)
    return jsonify({
        'success': True,
        'book': book.to_dict(include_copies=True)
    })

@books_bp.route('', methods=['POST'])
@admin_required
def create_book():
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    author = data.get('author', '').strip()
    category_id = data.get('category_id')
    isbn = data.get('isbn', '').strip()
    description = data.get('description', '').strip()
    cover_image = data.get('cover_image', '').strip()
    publisher = data.get('publisher', '').strip()
    publication_year = data.get('publication_year', type=int)
    page_count = data.get('page_count', type=int)
    copies_count = max(1, data.get('copies_count', 1))
    
    if not title or not author or not category_id:
        return jsonify({'success': False, 'message': 'Title, author, and category are required'}), 400
        
    book = Book(
        title=title,
        author=author,
        category_id=category_id,
        isbn=isbn,
        description=description,
        cover_image=cover_image or 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600',
        publisher=publisher,
        publication_year=publication_year,
        page_count=page_count
    )
    db.session.add(book)
    db.session.flush()
    
    # Create copies
    for i in range(1, copies_count + 1):
        copy = BookCopy(
            book_id=book.id,
            copy_number=f"BK-{book.id:04d}-C{i}",
            condition='New',
            status='available'
        )
        db.session.add(copy)
        
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Book created successfully',
        'book': book.to_dict(include_copies=True)
    }), 201

@books_bp.route('/<int:book_id>', methods=['PUT'])
@admin_required
def update_book(book_id):
    book = Book.query.get_or_404(book_id)
    data = request.get_json() or {}
    
    if 'title' in data:
        book.title = data['title'].strip()
    if 'author' in data:
        book.author = data['author'].strip()
    if 'category_id' in data:
        book.category_id = data['category_id']
    if 'isbn' in data:
        book.isbn = data['isbn'].strip()
    if 'description' in data:
        book.description = data['description'].strip()
    if 'cover_image' in data:
        book.cover_image = data['cover_image'].strip()
    if 'publisher' in data:
        book.publisher = data['publisher'].strip()
    if 'publication_year' in data:
        book.publication_year = data['publication_year']
    if 'page_count' in data:
        book.page_count = data['page_count']
        
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Book updated successfully',
        'book': book.to_dict(include_copies=True)
    })

@books_bp.route('/<int:book_id>', methods=['DELETE'])
@admin_required
def delete_book(book_id):
    book = Book.query.get_or_404(book_id)
    
    # Check if any copy is currently borrowed
    active_copies = [c for c in book.copies if c.status in ['borrowed', 'reserved']]
    if active_copies:
        return jsonify({'success': False, 'message': 'Cannot delete book with actively borrowed or reserved copies'}), 400
        
    db.session.delete(book)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Book deleted successfully'})

@books_bp.route('/<int:book_id>/copies', methods=['POST'])
@admin_required
def add_copy(book_id):
    book = Book.query.get_or_404(book_id)
    data = request.get_json() or {}
    condition = data.get('condition', 'Good')
    
    next_num = len(book.copies) + 1
    copy = BookCopy(
        book_id=book.id,
        copy_number=f"BK-{book.id:04d}-C{next_num}",
        condition=condition,
        status='available'
    )
    db.session.add(copy)
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Book copy added',
        'copy': copy.to_dict()
    }), 201

@books_bp.route('/copies/<int:copy_id>', methods=['DELETE'])
@admin_required
def delete_copy(copy_id):
    copy = BookCopy.query.get_or_404(copy_id)
    if copy.status != 'available':
        return jsonify({'success': False, 'message': 'Cannot delete a copy that is not available'}), 400
    db.session.delete(copy)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Book copy removed successfully'})
