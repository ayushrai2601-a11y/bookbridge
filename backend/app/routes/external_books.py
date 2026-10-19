import urllib.request
import urllib.parse
import json
import re
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from ..models import db, Book, BookCopy, Category, Notification
from ..utils import admin_required, notify_user

external_books_bp = Blueprint('external_books', __name__, url_prefix='/api/external-books')

USER_AGENT = 'BookBridge/2.0 (Digital Public Library; contact@bookbridge.org)'

def _map_subject_to_category(subjects):
    """Map external API subjects to internal library categories."""
    if not subjects:
        return 'Fiction & Literature', 'fiction'
        
    sub_text = ' '.join(str(s).lower() for s in subjects)
    
    if any(k in sub_text for k in ['computer', 'software', 'programming', 'science', 'technology', 'math', 'physics', 'engineering', 'algorithm']):
        return 'Science & Technology', 'science-technology'
    elif any(k in sub_text for k in ['history', 'biography', 'memoir', 'historical', 'world war', 'revolution']):
        return 'History & Biography', 'history-biography'
    elif any(k in sub_text for k in ['philosophy', 'ethics', 'logic', 'stoic', 'psychology', 'thought']):
        return 'Philosophy & Thought', 'philosophy'
    elif any(k in sub_text for k in ['art', 'design', 'architecture', 'photography', 'music', 'drawing']):
        return 'Arts & Design', 'arts-design'
    elif any(k in sub_text for k in ['juvenile', 'children', 'young adult', 'fairy', 'tales', 'fantasy']):
        return 'Children & Young Adult', 'children-ya'
    else:
        return 'Fiction & Literature', 'fiction'

def _fetch_from_open_library_isbn(isbn):
    """Fetch complete volume metadata from Open Library API by ISBN."""
    clean_isbn = re.sub(r'[^0-9X]', '', str(isbn).upper())
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{clean_isbn}&format=json&jscmd=data"
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    
    with urllib.request.urlopen(req, timeout=10) as res:
        data = json.loads(res.read().decode('utf-8'))
        key = f"ISBN:{clean_isbn}"
        if key not in data:
            return None
            
        b = data[key]
        authors = [a.get('name') for a in b.get('authors', []) if a.get('name')]
        author_str = ', '.join(authors) if authors else 'Unknown Author'
        
        publishers = [p.get('name') for p in b.get('publishers', []) if p.get('name')]
        pub_str = publishers[0] if publishers else 'Public Domain'
        
        # Cover image
        cover_url = ''
        if b.get('cover'):
            cover_url = b['cover'].get('large') or b['cover'].get('medium') or b['cover'].get('small') or ''
            
        if not cover_url:
            cover_url = f"https://covers.openlibrary.org/b/isbn/{clean_isbn}-L.jpg"
            
        # Year
        pub_date = b.get('publish_date', '')
        year = None
        match = re.search(r'\b(19\d\d|20\d\d)\b', str(pub_date))
        if match:
            year = int(match.group(1))
            
        subjects = [s.get('name') for s in b.get('subjects', []) if s.get('name')]
        cat_name, cat_slug = _map_subject_to_category(subjects)
        
        # Description
        desc = b.get('notes') or ''
        if not desc and subjects:
            desc = f"Archived volume exploring {', '.join(subjects[:4])}."
        if not desc:
            desc = f"Catalog edition of {b.get('title', 'Unknown')} by {author_str}."

        return {
            'title': b.get('title', 'Untitled'),
            'author': author_str,
            'isbn': clean_isbn,
            'publisher': pub_str,
            'publication_year': year or 2023,
            'page_count': b.get('number_of_pages') or 250,
            'cover_image': cover_url,
            'description': desc,
            'category_name': cat_name,
            'category_slug': cat_slug,
            'subjects': subjects[:6]
        }

@external_books_bp.route('/search', methods=['GET'])
def search_online():
    """
    Search Open Library API for books matching a query (title, author, or ISBN).
    Returns normalized book list and checks if each book is already stored in our local database.
    """
    query = request.args.get('q', '').strip()
    limit = min(20, max(1, request.args.get('limit', 10, type=int)))
    
    if not query:
        return jsonify({'success': False, 'message': 'Search query parameter q is required'}), 400
        
    encoded_q = urllib.parse.quote_plus(query)
    url = f"https://openlibrary.org/search.json?q={encoded_q}&limit={limit}"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req, timeout=10) as res:
            raw = json.loads(res.read().decode('utf-8'))
            docs = raw.get('docs', [])
            
            results = []
            for doc in docs:
                title = doc.get('title', 'Untitled')
                authors = doc.get('author_name', ['Unknown Author'])
                author_str = ', '.join(authors[:2])
                
                isbns = doc.get('isbn', [])
                primary_isbn = isbns[0] if isbns else 'N/A'
                
                cover_id = doc.get('cover_i')
                cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400'
                
                subjects = doc.get('subject', [])
                cat_name, cat_slug = _map_subject_to_category(subjects)
                
                # Check if already present in local SQLite database
                existing_book = None
                if primary_isbn != 'N/A':
                    existing_book = Book.query.filter_by(isbn=primary_isbn).first()
                if not existing_book:
                    existing_book = Book.query.filter_by(title=title, author=author_str).first()
                    
                results.append({
                    'title': title,
                    'author': author_str,
                    'isbn': primary_isbn,
                    'publication_year': doc.get('first_publish_year') or 2023,
                    'cover_image': cover_url,
                    'publisher': (doc.get('publisher') or ['Public Domain'])[0],
                    'category_name': cat_name,
                    'category_slug': cat_slug,
                    'already_in_catalog': existing_book is not None,
                    'local_book_id': existing_book.id if existing_book else None
                })
                
            return jsonify({
                'success': True,
                'source': 'Open Library Public Books API',
                'query': query,
                'total_found': raw.get('numFound', len(results)),
                'books': results
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to query Open Library API: {str(e)}'
        }), 502

@external_books_bp.route('/isbn/<isbn>', methods=['GET'])
def get_by_isbn(isbn):
    """Fetch rich details for a specific ISBN from Open Library API."""
    try:
        details = _fetch_from_open_library_isbn(isbn)
        if not details:
            return jsonify({
                'success': False,
                'message': f'No record found for ISBN {isbn} on Open Library API'
            }), 404
            
        # Check if exists locally
        existing = Book.query.filter_by(isbn=details['isbn']).first()
        details['already_in_catalog'] = existing is not None
        details['local_book_id'] = existing.id if existing else None
        
        return jsonify({
            'success': True,
            'source': 'Open Library Books API',
            'book': details
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'API error: {str(e)}'}), 502

@external_books_bp.route('/auto-fill', methods=['POST'])
@login_required
def auto_fill_form():
    """
    Auto-fill helper for donation or book listing forms.
    Accepts { "isbn": "..." } or { "query": "..." } and returns structured book fields.
    """
    data = request.get_json() or {}
    isbn = data.get('isbn', '').strip()
    query = data.get('query', '').strip()
    
    if isbn:
        details = _fetch_from_open_library_isbn(isbn)
        if details:
            return jsonify({'success': True, 'data': details})
            
    if query:
        # Search Open Library and take the top matching book
        encoded_q = urllib.parse.quote_plus(query)
        url = f"https://openlibrary.org/search.json?q={encoded_q}&limit=1"
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req, timeout=10) as res:
            raw = json.loads(res.read().decode('utf-8'))
            docs = raw.get('docs', [])
            if docs:
                doc = docs[0]
                isbns = doc.get('isbn', [])
                if isbns:
                    details = _fetch_from_open_library_isbn(isbns[0])
                    if details:
                        return jsonify({'success': True, 'data': details})
                # Fallback to search doc fields
                cat_name, cat_slug = _map_subject_to_category(doc.get('subject', []))
                cover_id = doc.get('cover_i')
                cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else ''
                return jsonify({
                    'success': True,
                    'data': {
                        'title': doc.get('title', ''),
                        'author': ', '.join(doc.get('author_name', ['Unknown'])[:2]),
                        'isbn': isbns[0] if isbns else '',
                        'publisher': (doc.get('publisher') or [''])[0],
                        'publication_year': doc.get('first_publish_year'),
                        'cover_image': cover_url,
                        'category_name': cat_name,
                        'category_slug': cat_slug,
                        'description': f"Volume by {', '.join(doc.get('author_name', ['Unknown'])[:2])}."
                    }
                })

    return jsonify({'success': False, 'message': 'No book found matching criteria'}), 404

@external_books_bp.route('/import', methods=['POST'])
@admin_required
def import_book_from_api():
    """
    Admin endpoint to import a book from Open Library API directly into SQLite database.
    Accepts { "isbn": "..." } or a complete book payload { "title": "...", "author": "...", ... }.
    Creates Category if needed, creates Book row, generates physical BookCopy barcodes, and commits.
    """
    data = request.get_json() or {}
    isbn = data.get('isbn', '').strip()
    copies_to_create = max(1, min(10, data.get('copies_count', 2)))
    
    # If only ISBN provided, fetch full details from API
    if isbn and not data.get('title'):
        details = _fetch_from_open_library_isbn(isbn)
        if not details:
            return jsonify({'success': False, 'message': f'Could not resolve ISBN {isbn} from Open Library API'}), 404
        data.update(details)
        
    title = data.get('title', '').strip()
    author = data.get('author', '').strip()
    if not title or not author:
        return jsonify({'success': False, 'message': 'Title and author are required to import'}), 400
        
    # Check if already exists in local database
    existing = None
    if isbn:
        existing = Book.query.filter_by(isbn=isbn).first()
    if not existing:
        existing = Book.query.filter_by(title=title, author=author).first()
        
    if existing:
        # Add copies instead of failing
        current_count = len(existing.copies)
        for i in range(1, copies_to_create + 1):
            copy = BookCopy(
                book_id=existing.id,
                copy_number=f"BK-{existing.id:04d}-C{current_count + i}",
                condition='New',
                status='available'
            )
            db.session.add(copy)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f"Book '{existing.title}' already in catalog. Added {copies_to_create} new copy(ies).",
            'book': existing.to_dict(include_copies=True)
        })
        
    # Resolve or create Category
    cat_name = data.get('category_name') or 'Fiction & Literature'
    category = Category.query.filter_by(name=cat_name).first()
    if not category:
        cat_slug = data.get('category_slug') or cat_name.lower().replace(' ', '-').replace('&', 'and')
        category = Category(
            name=cat_name,
            slug=cat_slug,
            description=f'Curated books in {cat_name}'
        )
        db.session.add(category)
        db.session.flush()
        
    # Create Book in SQLite database
    new_book = Book(
        title=title,
        author=author,
        category_id=category.id,
        isbn=isbn or 'N/A',
        description=data.get('description') or f"Curated edition imported via Open Library API.",
        cover_image=data.get('cover_image') or 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600',
        publisher=data.get('publisher') or 'Open Library Catalog',
        publication_year=data.get('publication_year') or datetime.now().year,
        page_count=data.get('page_count') or 280,
        language=data.get('language') or 'English'
    )
    db.session.add(new_book)
    db.session.flush()
    
    # Create Book Copies
    for i in range(1, copies_to_create + 1):
        copy = BookCopy(
            book_id=new_book.id,
            copy_number=f"BK-{new_book.id:04d}-C{i}",
            condition='New',
            status='available'
        )
        db.session.add(copy)
        
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f"Successfully imported '{new_book.title}' by {new_book.author} with {copies_to_create} circulation copies!",
        'book': new_book.to_dict(include_copies=True)
    }), 201
