from datetime import datetime, timezone
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from sqlalchemy.engine import Engine

db = SQLAlchemy()

# Enable SQLite foreign key constraints
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    except Exception:
        pass

def utcnow():
    return datetime.now(timezone.utc)

# 1. USER MODEL
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='user', index=True, nullable=False)  # 'user' or 'admin'
    phone = db.Column(db.String(30), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    avatar = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, index=True, nullable=False)
    
    # Relationships
    donations = db.relationship('Donation', backref='donor', lazy=True, cascade='all, delete-orphan')
    borrowing_requests = db.relationship('BorrowingRequest', backref='user', lazy=True, cascade='all, delete-orphan')
    borrowing_transactions = db.relationship('BorrowingTransaction', backref='user', lazy=True, cascade='all, delete-orphan')
    return_requests = db.relationship('ReturnRequest', backref='user', lazy=True, cascade='all, delete-orphan')
    exchange_listings = db.relationship('ExchangeListing', backref='owner', lazy=True, cascade='all, delete-orphan')
    exchange_requests_made = db.relationship('ExchangeRequest', backref='proposer', lazy=True, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade='all, delete-orphan', order_by='desc(Notification.created_at)')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    @property
    def is_admin(self):
        return self.role == 'admin'
        
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'phone': self.phone or '',
            'address': self.address or '',
            'bio': self.bio or '',
            'avatar': self.avatar or f"https://api.dicebear.com/7.x/initials/svg?seed={self.name}&backgroundColor=1b4332&textColor=ffffff",
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_admin': self.is_admin
        }

# 2. CATEGORY MODEL
class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, index=True, nullable=False)
    slug = db.Column(db.String(80), unique=True, index=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    icon = db.Column(db.String(50), default='BookOpen')
    
    books = db.relationship('Book', backref='category', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description or '',
            'icon': self.icon,
            'book_count': len(self.books)
        }

# 3. BOOK MODEL
class Book(db.Model):
    __tablename__ = 'books'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), index=True, nullable=False)
    author = db.Column(db.String(150), index=True, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='RESTRICT'), index=True, nullable=False)
    isbn = db.Column(db.String(50), index=True, nullable=True)
    description = db.Column(db.Text, nullable=True)
    cover_image = db.Column(db.String(500), nullable=True)
    publisher = db.Column(db.String(150), nullable=True)
    publication_year = db.Column(db.Integer, nullable=True)
    page_count = db.Column(db.Integer, nullable=True)
    language = db.Column(db.String(50), default='English')
    created_at = db.Column(db.DateTime, default=utcnow, index=True, nullable=False)
    
    # Relationships
    copies = db.relationship('BookCopy', backref='book', lazy=True, cascade='all, delete-orphan')
    donations = db.relationship('Donation', backref='book', lazy=True)
    
    @property
    def total_copies(self):
        return len(self.copies)
        
    @property
    def available_copies(self):
        return [copy for copy in self.copies if copy.status == 'available']
        
    @property
    def is_available(self):
        return len(self.available_copies) > 0
        
    def to_dict(self, include_copies=False):
        data = {
            'id': self.id,
            'title': self.title,
            'author': self.author,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else 'General',
            'isbn': self.isbn or 'N/A',
            'description': self.description or '',
            'cover_image': self.cover_image or 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600',
            'publisher': self.publisher or 'Public Domain',
            'publication_year': self.publication_year or 2023,
            'page_count': self.page_count or 250,
            'language': self.language or 'English',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'total_copies_count': self.total_copies,
            'available_copies_count': len(self.available_copies),
            'is_available': self.is_available
        }
        if include_copies:
            data['copies'] = [copy.to_dict() for copy in self.copies]
        return data

# 4. BOOK COPY MODEL
class BookCopy(db.Model):
    __tablename__ = 'book_copies'
    
    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), index=True, nullable=False)
    copy_number = db.Column(db.String(50), unique=True, index=True, nullable=False)
    condition = db.Column(db.String(50), default='Good', nullable=False)  # New, Like New, Good, Fair
    status = db.Column(db.String(30), default='available', index=True, nullable=False)  # available, reserved, borrowed, maintenance
    added_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    
    # Relationships
    borrowing_requests = db.relationship('BorrowingRequest', backref='book_copy', lazy=True)
    borrowing_transactions = db.relationship('BorrowingTransaction', backref='book_copy', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'book_id': self.book_id,
            'book_title': self.book.title if self.book else '',
            'copy_number': self.copy_number,
            'condition': self.condition,
            'status': self.status,
            'added_at': self.added_at.isoformat() if self.added_at else None
        }

# 5. DONATION MODEL
class Donation(db.Model):
    __tablename__ = 'donations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='SET NULL'), index=True, nullable=True)
    title = db.Column(db.String(200), index=True, nullable=False)
    author = db.Column(db.String(150), index=True, nullable=False)
    category_name = db.Column(db.String(80), nullable=False)
    condition = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=True)
    cover_image = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(30), default='pending', index=True, nullable=False)  # pending, approved, rejected
    admin_notes = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, index=True, nullable=False)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'donor_name': self.donor.name if self.donor else 'Anonymous',
            'donor_email': self.donor.email if self.donor else '',
            'book_id': self.book_id,
            'title': self.title,
            'author': self.author,
            'category_name': self.category_name,
            'condition': self.condition,
            'description': self.description or '',
            'cover_image': self.cover_image or 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
            'status': self.status,
            'admin_notes': self.admin_notes or '',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None
        }

# 6. BORROWING REQUEST MODEL
class BorrowingRequest(db.Model):
    __tablename__ = 'borrowing_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    book_copy_id = db.Column(db.Integer, db.ForeignKey('book_copies.id', ondelete='CASCADE'), index=True, nullable=False)
    status = db.Column(db.String(30), default='pending', index=True, nullable=False)  # pending, approved, rejected, cancelled
    requested_duration_days = db.Column(db.Integer, default=14, nullable=False)
    request_date = db.Column(db.DateTime, default=utcnow, index=True, nullable=False)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    admin_notes = db.Column(db.String(255), nullable=True)
    
    transaction = db.relationship('BorrowingTransaction', backref='request', uselist=False, lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else 'Unknown',
            'user_email': self.user.email if self.user else '',
            'book_copy_id': self.book_copy_id,
            'copy_number': self.book_copy.copy_number if self.book_copy else '',
            'book_id': self.book_copy.book_id if self.book_copy else None,
            'book_title': self.book_copy.book.title if self.book_copy and self.book_copy.book else '',
            'book_author': self.book_copy.book.author if self.book_copy and self.book_copy.book else '',
            'cover_image': self.book_copy.book.cover_image if self.book_copy and self.book_copy.book else '',
            'status': self.status,
            'requested_duration_days': self.requested_duration_days,
            'request_date': self.request_date.isoformat() if self.request_date else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'admin_notes': self.admin_notes or ''
        }

# 7. BORROWING TRANSACTION MODEL
class BorrowingTransaction(db.Model):
    __tablename__ = 'borrowing_transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    book_copy_id = db.Column(db.Integer, db.ForeignKey('book_copies.id', ondelete='CASCADE'), index=True, nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey('borrowing_requests.id', ondelete='SET NULL'), index=True, nullable=True)
    borrow_date = db.Column(db.DateTime, default=utcnow, index=True, nullable=False)
    due_date = db.Column(db.DateTime, index=True, nullable=False)
    returned_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(30), default='active', index=True, nullable=False)  # active, return_pending, returned, overdue
    
    return_request = db.relationship('ReturnRequest', backref='transaction', uselist=False, lazy=True)
    
    @property
    def is_overdue(self):
        if self.status in ['active', 'return_pending']:
            now = datetime.now(timezone.utc)
            due = self.due_date
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            return now > due
        return self.status == 'overdue'
        
    def to_dict(self):
        effective_status = self.status
        if self.is_overdue and effective_status == 'active':
            effective_status = 'overdue'
            
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else 'Unknown',
            'user_email': self.user.email if self.user else '',
            'book_copy_id': self.book_copy_id,
            'copy_number': self.book_copy.copy_number if self.book_copy else '',
            'book_id': self.book_copy.book_id if self.book_copy else None,
            'book_title': self.book_copy.book.title if self.book_copy and self.book_copy.book else '',
            'book_author': self.book_copy.book.author if self.book_copy and self.book_copy.book else '',
            'cover_image': self.book_copy.book.cover_image if self.book_copy and self.book_copy.book else '',
            'request_id': self.request_id,
            'borrow_date': self.borrow_date.isoformat() if self.borrow_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'returned_date': self.returned_date.isoformat() if self.returned_date else None,
            'status': effective_status,
            'is_overdue': self.is_overdue,
            'has_return_request': self.return_request is not None and self.return_request.status == 'pending'
        }

# 8. RETURN REQUEST MODEL
class ReturnRequest(db.Model):
    __tablename__ = 'return_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey('borrowing_transactions.id', ondelete='CASCADE'), index=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    request_date = db.Column(db.DateTime, default=utcnow, index=True, nullable=False)
    status = db.Column(db.String(30), default='pending', index=True, nullable=False)  # pending, confirmed, rejected
    condition_notes = db.Column(db.String(255), nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'transaction_id': self.transaction_id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else 'Unknown',
            'book_title': self.transaction.book_copy.book.title if self.transaction and self.transaction.book_copy and self.transaction.book_copy.book else '',
            'copy_number': self.transaction.book_copy.copy_number if self.transaction and self.transaction.book_copy else '',
            'request_date': self.request_date.isoformat() if self.request_date else None,
            'status': self.status,
            'condition_notes': self.condition_notes or '',
            'confirmed_at': self.confirmed_at.isoformat() if self.confirmed_at else None
        }

# 9. EXCHANGE LISTING MODEL
class ExchangeListing(db.Model):
    __tablename__ = 'exchange_listings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    title = db.Column(db.String(200), index=True, nullable=False)
    author = db.Column(db.String(150), index=True, nullable=False)
    category = db.Column(db.String(80), index=True, nullable=False)
    condition = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=True)
    cover_image = db.Column(db.String(500), nullable=True)
    looking_for = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(30), default='available', index=True, nullable=False)  # available, pending_exchange, exchanged, cancelled
    created_at = db.Column(db.DateTime, default=utcnow, index=True, nullable=False)
    
    requests = db.relationship('ExchangeRequest', backref='listing', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self, include_requests=False):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'owner_name': self.owner.name if self.owner else 'Unknown',
            'owner_email': self.owner.email if self.owner else '',
            'title': self.title,
            'author': self.author,
            'category': self.category,
            'condition': self.condition,
            'description': self.description or '',
            'cover_image': self.cover_image or 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600',
            'looking_for': self.looking_for or 'Any good literature',
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'requests_count': len([r for r in self.requests if r.status == 'pending'])
        }
        if include_requests:
            data['requests'] = [r.to_dict() for r in self.requests]
        return data

# 10. EXCHANGE REQUEST MODEL
class ExchangeRequest(db.Model):
    __tablename__ = 'exchange_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey('exchange_listings.id', ondelete='CASCADE'), index=True, nullable=False)
    proposer_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    offered_title = db.Column(db.String(200), index=True, nullable=False)
    offered_author = db.Column(db.String(150), nullable=False)
    offered_condition = db.Column(db.String(50), nullable=False)
    message = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(30), default='pending', index=True, nullable=False)  # pending, accepted, rejected, cancelled
    created_at = db.Column(db.DateTime, default=utcnow, index=True, nullable=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'listing_id': self.listing_id,
            'listing_title': self.listing.title if self.listing else '',
            'listing_owner_id': self.listing.user_id if self.listing else None,
            'listing_owner_name': self.listing.owner.name if self.listing and self.listing.owner else '',
            'proposer_id': self.proposer_id,
            'proposer_name': self.proposer.name if self.proposer else 'Unknown',
            'proposer_email': self.proposer.email if self.proposer else '',
            'offered_title': self.offered_title,
            'offered_author': self.offered_author,
            'offered_condition': self.offered_condition,
            'message': self.message or '',
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# 11. NOTIFICATION MODEL
class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default='info', nullable=False)  # info, success, warning, danger
    link = db.Column(db.String(255), nullable=True)
    is_read = db.Column(db.Boolean, default=False, index=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, index=True, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'link': self.link or '',
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# 12. BOOK REVIEW MODEL
class BookReview(db.Model):
    __tablename__ = 'book_reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), index=True, nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    review_text = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, index=True, nullable=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'book_id', name='uq_user_book_review'),)
    
    reviewer = db.relationship('User', backref=db.backref('reviews', lazy=True))
    book = db.relationship('Book', backref=db.backref('reviews', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.reviewer.name if self.reviewer else 'Anonymous',
            'user_avatar': self.reviewer.avatar or f"https://api.dicebear.com/7.x/initials/svg?seed={self.reviewer.name if self.reviewer else 'U'}" if self.reviewer else '',
            'book_id': self.book_id,
            'rating': self.rating,
            'review_text': self.review_text or '',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# 13. READING LIST MODEL
class ReadingList(db.Model):
    __tablename__ = 'reading_lists'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id', ondelete='CASCADE'), index=True, nullable=False)
    list_type = db.Column(db.String(30), nullable=False, index=True)  # 'wishlist', 'favorites', 'currently_reading'
    added_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'book_id', 'list_type', name='uq_user_book_list'),)
    
    user = db.relationship('User', backref=db.backref('reading_lists', lazy=True))
    book = db.relationship('Book', backref=db.backref('reading_list_entries', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'book_id': self.book_id,
            'book_title': self.book.title if self.book else '',
            'book_author': self.book.author if self.book else '',
            'cover_image': self.book.cover_image if self.book else '',
            'is_available': self.book.is_available if self.book else False,
            'list_type': self.list_type,
            'added_at': self.added_at.isoformat() if self.added_at else None
        }

# 14. TRUSTED GMAIL MODEL
class TrustedGmail(db.Model):
    __tablename__ = 'trusted_gmails'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, index=True, nullable=False)
    name = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.String(255), nullable=True)
    added_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name or '',
            'notes': self.notes or '',
            'added_at': self.added_at.isoformat() if self.added_at else None
        }

