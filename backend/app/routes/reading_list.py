from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from app.models import db, ReadingList, Book

reading_list_bp = Blueprint(
    "reading_list", __name__, url_prefix="/api/reading-list"
)

VALID_LIST_TYPES = {"wishlist", "favorites", "currently_reading"}


def _item_to_dict(item, book):
    """Serialize a ReadingList row + Book into a response dict."""
    return {
        "list_id": item.id,
        "book_id": book.id,
        "book_title": book.title,
        "book_author": book.author,
        "cover_image": book.cover_image if hasattr(book, "cover_image") else None,
        "added_at": item.added_at.isoformat() if item.added_at else None,
        "list_type": item.list_type,
    }


# ---------------------------------------------------------------------------
# GET /api/reading-list  – login required
# ---------------------------------------------------------------------------
@reading_list_bp.route("", methods=["GET"])
@login_required
def get_reading_list():
    """Return the current user's reading list grouped by list_type."""
    try:
        items = (
            db.session.query(ReadingList, Book)
            .join(Book, ReadingList.book_id == Book.id)
            .filter(ReadingList.user_id == current_user.id)
            .order_by(ReadingList.added_at.desc())
            .all()
        )

        grouped = {"wishlist": [], "favorites": [], "currently_reading": []}
        for item, book in items:
            entry = _item_to_dict(item, book)
            grouped.setdefault(item.list_type, []).append(entry)

        return jsonify(
            {
                "success": True,
                "wishlist": grouped["wishlist"],
                "favorites": grouped["favorites"],
                "currently_reading": grouped["currently_reading"],
            }
        ), 200

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# ---------------------------------------------------------------------------
# POST /api/reading-list  – login required
# ---------------------------------------------------------------------------
@reading_list_bp.route("", methods=["POST"])
@login_required
def add_to_reading_list():
    """Add a book to one of the user's reading lists."""
    try:
        data = request.get_json(silent=True) or {}
        book_id = data.get("book_id")
        list_type = data.get("list_type")

        if not book_id:
            return jsonify({"success": False, "error": "book_id is required"}), 400
        if list_type not in VALID_LIST_TYPES:
            return jsonify(
                {
                    "success": False,
                    "error": f"list_type must be one of: {', '.join(VALID_LIST_TYPES)}",
                }
            ), 400

        book = Book.query.get(book_id)
        if not book:
            return jsonify({"success": False, "error": "Book not found"}), 404

        # Check for duplicate entry on the same list
        existing = ReadingList.query.filter_by(
            user_id=current_user.id, book_id=book_id, list_type=list_type
        ).first()
        if existing:
            return jsonify(
                {
                    "success": False,
                    "error": "Book is already on this list",
                    "item": _item_to_dict(existing, book),
                }
            ), 409

        item = ReadingList(
            user_id=current_user.id,
            book_id=book_id,
            list_type=list_type,
        )
        db.session.add(item)
        db.session.commit()

        return jsonify(
            {
                "success": True,
                "message": "Book added to reading list",
                "item": _item_to_dict(item, book),
            }
        ), 201

    except Exception as exc:
        db.session.rollback()
        return jsonify({"success": False, "error": str(exc)}), 500


# ---------------------------------------------------------------------------
# DELETE /api/reading-list/<list_id>  – login required
# ---------------------------------------------------------------------------
@reading_list_bp.route("/<int:list_id>", methods=["DELETE"])
@login_required
def remove_from_reading_list(list_id):
    """Remove an item from the current user's reading list."""
    try:
        item = ReadingList.query.get(list_id)
        if not item:
            return jsonify({"success": False, "error": "Reading list item not found"}), 404

        if item.user_id != current_user.id:
            return jsonify(
                {"success": False, "error": "Not authorised to remove this item"}
            ), 403

        db.session.delete(item)
        db.session.commit()

        return jsonify({"success": True, "message": "Item removed from reading list"}), 200

    except Exception as exc:
        db.session.rollback()
        return jsonify({"success": False, "error": str(exc)}), 500


# ---------------------------------------------------------------------------
# GET /api/reading-list/check/<book_id>  – login required
# ---------------------------------------------------------------------------
@reading_list_bp.route("/check/<int:book_id>", methods=["GET"])
@login_required
def check_book_lists(book_id):
    """Check which of the user's lists contain a specific book."""
    try:
        items = ReadingList.query.filter_by(
            user_id=current_user.id, book_id=book_id
        ).all()

        list_ids = {"wishlist": None, "favorites": None, "currently_reading": None}
        for item in items:
            if item.list_type in list_ids:
                list_ids[item.list_type] = item.id

        return jsonify(
            {
                "success": True,
                "on_wishlist": list_ids["wishlist"] is not None,
                "on_favorites": list_ids["favorites"] is not None,
                "on_currently_reading": list_ids["currently_reading"] is not None,
                "list_ids": list_ids,
            }
        ), 200

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
