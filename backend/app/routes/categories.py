from flask import Blueprint, jsonify, request
from ..models import db, Category
from ..utils import admin_required

categories_bp = Blueprint('categories', __name__, url_prefix='/api/categories')

@categories_bp.route('', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify({
        'success': True,
        'categories': [c.to_dict() for c in categories]
    })

@categories_bp.route('', methods=['POST'])
@admin_required
def create_category():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    slug = data.get('slug', '').strip().lower() or name.lower().replace(' ', '-')
    description = data.get('description', '').strip()
    icon = data.get('icon', 'BookOpen').strip()
    
    if not name:
        return jsonify({'success': False, 'message': 'Category name is required'}), 400
        
    if Category.query.filter_by(name=name).first():
        return jsonify({'success': False, 'message': 'Category already exists'}), 409
        
    cat = Category(name=name, slug=slug, description=description, icon=icon)
    db.session.add(cat)
    db.session.commit()
    return jsonify({'success': True, 'category': cat.to_dict()}), 201
