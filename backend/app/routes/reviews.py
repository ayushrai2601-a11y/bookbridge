from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from app.models import db, BookReview, Book, User
from sqlalchemy import func

reviews_bp = Blueprint("reviews", __name__, url_prefix="/api/reviews")


def _review_to_dict(review, user):
    """Serialize a BookReview + User into a response dict."""
    return {
        "id": review.id,
        "user_id": review.user_id,
        "user_name": user.name if user else "Unknown",
        "user_avatar": user.avatar if hasattr(user, "avatar") else None,
        "rating": review.rating,
        "review_text": review.review_text,
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }


def _avg_rating_for_book(book_id):
    """Return avg rating rounded to 1 decimal, or None if no reviews."""
    avg = (
        db.session.query(func.avg(BookReview.rating))
        .filter(BookReview.book_id == book_id)
        .scalar()
    )
    return round(float(avg), 1) if avg is not None else None


# ---------------------------------------------------------------------------
# GET /api/reviews/book/<book_id>  – public
# ---------------------------------------------------------------------------
@reviews_bp.route("/book/<int:book_id>", methods=["GET"])
def get_reviews_for_book(book_id):
    """Return all reviews for a given book."""
    try:
        book = Book.query.get(book_id)
        if not book:
            return jsonify({"success": False, "error": "Book not found"}), 404

        reviews = (
            db.session.query(BookReview, User)
            .join(User, BookReview.user_id == User.id)
            .filter(BookReview.book_id == book_id)
            .order_by(BookReview.created_at.desc())
            .all()
        )

        avg_rating = _avg_rating_for_book(book_id)

        return jsonify(
            {
                "success": True,
                "reviews": [_review_to_dict(r, u) for r, u in reviews],
                "avg_rating": avg_rating,
                "total_reviews": len(reviews),
            }
        ), 200

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# ---------------------------------------------------------------------------
# POST /api/reviews/book/<book_id>  – login required (upsert)
# ---------------------------------------------------------------------------
@reviews_bp.route("/book/<int:book_id>", methods=["POST"])
@login_required
def submit_review(book_id):
    """Create or update the current user's review for a book."""
    try:
        book = Book.query.get(book_id)
        if not book:
            return jsonify({"success": False, "error": "Book not found"}), 404

        data = request.get_json(silent=True) or {}
        rating = data.get("rating")
        review_text = data.get("review_text", "").strip()

        # Validate rating
        if rating is None:
            return jsonify({"success": False, "error": "rating is required"}), 400
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            return jsonify({"success": False, "error": "rating must be an integer"}), 400
        if rating < 1 or rating > 5:
            return jsonify({"success": False, "error": "rating must be between 1 and 5"}), 400

        # Upsert: check for existing review by this user on this book
        existing = BookReview.query.filter_by(
            book_id=book_id, user_id=current_user.id
        ).first()

        if existing:
            existing.rating = rating
            existing.review_text = review_text or existing.review_text
            review = existing
            message = "Review updated successfully"
        else:
            review = BookReview(
                book_id=book_id,
                user_id=current_user.id,
                rating=rating,
                review_text=review_text or None,
            )
            db.session.add(review)
            message = "Review submitted successfully"

        db.session.commit()
        avg_rating = _avg_rating_for_book(book_id)

        return jsonify(
            {
                "success": True,
                "message": message,
                "review": _review_to_dict(review, current_user),
                "avg_rating": avg_rating,
            }
        ), 200

    except Exception as exc:
        db.session.rollback()
        return jsonify({"success": False, "error": str(exc)}), 500


# ---------------------------------------------------------------------------
# DELETE /api/reviews/<review_id>  – login required
# ---------------------------------------------------------------------------
@reviews_bp.route("/<int:review_id>", methods=["DELETE"])
@login_required
def delete_review(review_id):
    """Delete a review. Users may delete their own; admins may delete any."""
    try:
        review = BookReview.query.get(review_id)
        if not review:
            return jsonify({"success": False, "error": "Review not found"}), 404

        is_admin = getattr(current_user, "is_admin", False)
        if review.user_id != current_user.id and not is_admin:
            return jsonify(
                {"success": False, "error": "Not authorised to delete this review"}
            ), 403

        db.session.delete(review)
        db.session.commit()

        return jsonify({"success": True, "message": "Review deleted"}), 200

    except Exception as exc:
        db.session.rollback()
        return jsonify({"success": False, "error": str(exc)}), 500
