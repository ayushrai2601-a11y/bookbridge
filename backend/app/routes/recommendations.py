from flask import Blueprint, jsonify
from flask_login import current_user
from app.models import db, Book, BorrowingTransaction, BookCopy, BookReview, ReadingList
from sqlalchemy import func

recommendations_bp = Blueprint(
    "recommendations", __name__, url_prefix="/api/recommendations"
)

RECOMMENDATION_LIMIT = 6


def _popular_books():
    """
    Fallback strategy: return highest-rated books by average review rating.
    Falls back to books with the most copies if no reviews exist.
    """
    # Subquery: avg rating per book
    avg_subq = (
        db.session.query(
            BookReview.book_id.label("book_id"),
            func.avg(BookReview.rating).label("avg_rating"),
        )
        .group_by(BookReview.book_id)
        .subquery()
    )

    rated_books = (
        db.session.query(Book)
        .join(avg_subq, Book.id == avg_subq.c.book_id)
        .order_by(avg_subq.c.avg_rating.desc())
        .limit(RECOMMENDATION_LIMIT)
        .all()
    )

    if rated_books:
        return rated_books, "popular"

    # Ultimate fallback: books with the most copies
    copy_subq = (
        db.session.query(
            BookCopy.book_id.label("book_id"),
            func.count(BookCopy.id).label("copy_count"),
        )
        .group_by(BookCopy.book_id)
        .subquery()
    )

    books_by_copies = (
        db.session.query(Book)
        .join(copy_subq, Book.id == copy_subq.c.book_id)
        .order_by(copy_subq.c.copy_count.desc())
        .limit(RECOMMENDATION_LIMIT)
        .all()
    )

    if books_by_copies:
        return books_by_copies, "popular"

    # Last resort: just return the most recently added books
    return Book.query.order_by(Book.id.desc()).limit(RECOMMENDATION_LIMIT).all(), "popular"


def _personalized_books(user_id):
    """
    Personalized strategy: find categories of books the user has borrowed,
    then recommend books from those categories that they haven't borrowed.
    """
    # IDs of books the user has already borrowed
    borrowed_book_ids_subq = (
        db.session.query(BookCopy.book_id)
        .join(BorrowingTransaction, BorrowingTransaction.book_copy_id == BookCopy.id)
        .filter(BorrowingTransaction.user_id == user_id)
        .subquery()
    )

    # Category IDs from those borrowed books
    borrowed_category_ids = (
        db.session.query(Book.category_id)
        .filter(Book.id.in_(borrowed_book_ids_subq))
        .filter(Book.category_id.isnot(None))
        .distinct()
        .all()
    )
    category_ids = [row[0] for row in borrowed_category_ids]

    if not category_ids:
        return None  # no borrow history → caller uses popular fallback

    # Books in those categories not yet borrowed by the user
    recommendations = (
        Book.query.filter(
            Book.category_id.in_(category_ids),
            Book.id.notin_(borrowed_book_ids_subq),
        )
        .limit(RECOMMENDATION_LIMIT)
        .all()
    )

    return recommendations


# ---------------------------------------------------------------------------
# GET /api/recommendations  – no auth required
# ---------------------------------------------------------------------------
@recommendations_bp.route("", methods=["GET"])
def get_recommendations():
    """
    Return smart book recommendations.

    - Authenticated users with borrow history → personalized (same categories,
      books not yet borrowed).
    - Everyone else → most popular by avg review rating.
    """
    try:
        strategy = "popular"
        books = []

        if current_user.is_authenticated:
            personalized = _personalized_books(current_user.id)
            if personalized:
                books = personalized
                strategy = "personalized"

        if not books:
            books, strategy = _popular_books()

        return jsonify(
            {
                "success": True,
                "recommendations": [book.to_dict() for book in books],
                "strategy": strategy,
            }
        ), 200

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
