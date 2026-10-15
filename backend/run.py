import os
from app import create_app
from app.models import db

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '127.0.0.1')
    
    with app.app_context():
        # Ensure tables exist
        db.create_all()
        from app.models import Book
        if Book.query.count() == 0:
            print("Database is empty. Populating with sample records...")
            try:
                from seed_data import seed_database
                seed_database()
            except Exception as e:
                print(f"Auto-seed exception: {e}")
        
    print(f"BookBridge Backend starting on http://{host}:{port}")
    app.run(host=host, port=port, debug=True)
