from flask import Flask, jsonify, render_template
from flask_login import LoginManager
from flask_cors import CORS
from config import Config
from .models import db, User

login_manager = LoginManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    
    # Ensure database tables exist (e.g. trusted_gmails)
    with app.app_context():
        from .models import TrustedGmail
        db.create_all()
        # Seed default trusted gmails if table is empty
        if TrustedGmail.query.count() == 0:
            default_trusted = [
                TrustedGmail(email='admin@bookbridge.org', name='Eleanor Vance', notes='Head Librarian'),
                TrustedGmail(email='alex.reader@gmail.com', name='Alex Rivera', notes='Verified Patron (Literature)'),
                TrustedGmail(email='maya.researcher@gmail.com', name='Dr. Maya Lin', notes='Academic Researcher'),
                TrustedGmail(email='clara.oswald@gmail.com', name='Clara Oswald', notes='Verified Senior Patron')
            ]
            db.session.add_all(default_trusted)
            db.session.commit()
    
    # CORS setup to allow credentials for session cookies
    CORS(app, supports_credentials=True, origins=app.config['CORS_ORIGINS'])
    
    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))
        
    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'success': False, 'message': 'Authentication required'}), 401

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.books import books_bp
    from .routes.categories import categories_bp
    from .routes.donations import donations_bp
    from .routes.borrowings import borrowings_bp
    from .routes.returns import returns_bp
    from .routes.exchanges import exchanges_bp
    from .routes.notifications import notifications_bp
    from .routes.admin import admin_bp
    from .routes.stats import stats_bp
    from .routes.reviews import reviews_bp
    from .routes.reading_list import reading_list_bp
    from .routes.recommendations import recommendations_bp
    from .routes.external_books import external_books_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(books_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(donations_bp)
    app.register_blueprint(borrowings_bp)
    app.register_blueprint(returns_bp)
    app.register_blueprint(exchanges_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(reading_list_bp)
    app.register_blueprint(recommendations_bp)
    app.register_blueprint(external_books_bp)
    
    @app.route('/', methods=['GET'])
    def index():
        return render_template('index.html')

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy', 'service': 'BookBridge API', 'version': '1.0.0'})
        
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'message': 'Resource not found'}), 404
        
    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'success': False, 'message': 'Internal server error'}), 500
        
    return app
