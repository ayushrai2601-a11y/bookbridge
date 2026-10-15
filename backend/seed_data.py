import os
from datetime import datetime, timezone, timedelta
from app import create_app
from app.models import db, User, Category, Book, BookCopy, Donation, BorrowingRequest, BorrowingTransaction, ReturnRequest, ExchangeListing, ExchangeRequest, Notification, BookReview, ReadingList

app = create_app()

def seed_database():
    with app.app_context():
        print("Recreating database tables...")
        db.drop_all()
        db.create_all()
        
        now = datetime.now(timezone.utc)
        
        # 1. Create Users
        print("Creating users...")
        admin = User(
            name="Eleanor Vance (Head Librarian)",
            email="admin@bookbridge.org",
            role="admin",
            phone="+1 (555) 019-2834",
            address="Central Public Library, 42 Heritage Way, Boston, MA",
            bio="Chief Curator and Community Library Administrator at BookBridge with 15+ years of archival and literary curation experience.",
            avatar="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400"
        )
        admin.set_password("admin123")
        
        user1 = User(
            name="Sarah Jenkins",
            email="sarah@example.com",
            role="user",
            phone="+1 (555) 382-9102",
            address="14 Elm Street, Cambridge, MA",
            bio="Literature graduate student and avid historical fiction enthusiast.",
            avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400"
        )
        user1.set_password("user123")
        
        user2 = User(
            name="Marcus Sterling",
            email="marcus@example.com",
            role="user",
            phone="+1 (555) 492-1184",
            address="88 Beacon Hill, Boston, MA",
            bio="Software engineer reading sci-fi, distributed systems, and modern philosophy.",
            avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400"
        )
        user2.set_password("user123")
        
        user3 = User(
            name="Priya Sharma",
            email="priya@example.com",
            role="user",
            phone="+1 (555) 671-8930",
            address="32 Riverdale Crescent, Somerville, MA",
            bio="High school educator promoting reading clubs and community exchange.",
            avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400"
        )
        user3.set_password("user123")
        
        db.session.add_all([admin, user1, user2, user3])
        db.session.flush()
        
        # 2. Create Categories
        print("Creating categories...")
        categories_data = [
            {"name": "Fiction & Literature", "slug": "fiction", "description": "Classic and contemporary novels, dramas, and stories.", "icon": "BookOpen"},
            {"name": "Science & Technology", "slug": "science-technology", "description": "Computer science, physics, biology, and scientific discoveries.", "icon": "Cpu"},
            {"name": "History & Biography", "slug": "history-biography", "description": "World history, memoirs, and pivotal world events.", "icon": "Landmark"},
            {"name": "Philosophy & Thought", "slug": "philosophy", "description": "Ethics, existentialism, logic, and profound ideas.", "icon": "Compass"},
            {"name": "Arts & Design", "slug": "arts-design", "description": "Visual arts, architecture, typography, and creative craft.", "icon": "Palette"},
            {"name": "Children & Young Adult", "slug": "children-ya", "description": "Inspiring tales, adventurous sagas, and educational reads.", "icon": "Smile"}
        ]
        
        cat_map = {}
        for c_data in categories_data:
            cat = Category(**c_data)
            db.session.add(cat)
            cat_map[cat.slug] = cat
        db.session.flush()
        
        # 3. Create Books with Copies
        print("Creating book catalog...")
        books_data = [
            {
                "title": "To Kill a Mockingbird",
                "author": "Harper Lee",
                "category": cat_map["fiction"],
                "isbn": "978-0061120084",
                "publisher": "J. B. Lippincott & Co.",
                "publication_year": 1960,
                "page_count": 324,
                "cover_image": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600",
                "description": "The unforgettable novel of a childhood in a sleepy Southern town and the crisis of conscience that rocked it, exploring compassion and justice.",
                "copies": 3
            },
            {
                "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
                "author": "Robert C. Martin",
                "category": cat_map["science-technology"],
                "isbn": "978-0132350884",
                "publisher": "Prentice Hall",
                "publication_year": 2008,
                "page_count": 464,
                "cover_image": "https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&q=80&w=600",
                "description": "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees. A timeless guide to elegant software craftsmanship.",
                "copies": 2
            },
            {
                "title": "Sapiens: A Brief History of Humankind",
                "author": "Yuval Noah Harari",
                "category": cat_map["history-biography"],
                "isbn": "978-0062316097",
                "publisher": "Harper",
                "publication_year": 2014,
                "page_count": 498,
                "cover_image": "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&q=80&w=600",
                "description": "From a renowned historian comes a groundbreaking narrative of humanity's creation and evolution that explores the ways in which biology and history have defined us.",
                "copies": 4
            },
            {
                "title": "Meditations",
                "author": "Marcus Aurelius",
                "category": cat_map["philosophy"],
                "isbn": "978-0812968255",
                "publisher": "Modern Library",
                "publication_year": 2002,
                "page_count": 256,
                "cover_image": "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600",
                "description": "Written in Greek by the only Roman emperor who was also a philosopher, Meditations remains one of the greatest works of spiritual and ethical reflection in world literature.",
                "copies": 3
            },
            {
                "title": "The Design of Everyday Things",
                "author": "Don Norman",
                "category": cat_map["arts-design"],
                "isbn": "978-0465050659",
                "publisher": "Basic Books",
                "publication_year": 2013,
                "page_count": 368,
                "cover_image": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=600",
                "description": "Even the smartest among us can feel inept when trying to figure out whether to push or pull an unfamiliar door. Norman explains why usability and human-centric design matter.",
                "copies": 2
            },
            {
                "title": "The Little Prince",
                "author": "Antoine de Saint-Exupéry",
                "category": cat_map["children-ya"],
                "isbn": "978-0156012195",
                "publisher": "Reynal & Hitchcock",
                "publication_year": 1943,
                "page_count": 96,
                "cover_image": "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600",
                "description": "A poetic tale of loneliness, friendship, love, and loss, in the form of a young prince visiting various planets in space, including Earth.",
                "copies": 3
            },
            {
                "title": "1984",
                "author": "George Orwell",
                "category": cat_map["fiction"],
                "isbn": "978-0451524935",
                "publisher": "Secker & Warburg",
                "publication_year": 1949,
                "page_count": 328,
                "cover_image": "https://images.unsplash.com/photo-1535905557558-afc4877a26fc?auto=format&fit=crop&q=80&w=600",
                "description": "Winston Smith toes the Party line, rewriting history with Big Brother watching. A chilling prophecy of totalitarian surveillance that remains acutely relevant.",
                "copies": 2
            },
            {
                "title": "Designing Data-Intensive Applications",
                "author": "Martin Kleppmann",
                "category": cat_map["science-technology"],
                "isbn": "978-1449373320",
                "publisher": "O'Reilly Media",
                "publication_year": 2017,
                "page_count": 616,
                "cover_image": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=600",
                "description": "Data is at the center of many challenges in system design today. Discover the key principles, algorithms, and trade-offs of modern data architectures.",
                "copies": 2
            }
        ]
        
        created_books = []
        all_copies = []
        for b_item in books_data:
            num_copies = b_item.pop("copies")
            b_item["category_id"] = b_item.pop("category").id
            book = Book(**b_item)
            db.session.add(book)
            db.session.flush()
            created_books.append(book)
            
            for c_idx in range(1, num_copies + 1):
                copy = BookCopy(
                    book_id=book.id,
                    copy_number=f"BK-{book.id:04d}-C{c_idx}",
                    condition="New" if c_idx == 1 else "Good",
                    status="available"
                )
                db.session.add(copy)
                all_copies.append(copy)
                
        db.session.flush()
        
        # 4. Set up Borrowings (Active, Overdue, and Returned)
        print("Creating borrowing transactions and requests...")
        
        # Overdue borrowing for user1 (To Kill a Mockingbird copy 1)
        all_copies[0].status = "borrowed"
        tx_overdue = BorrowingTransaction(
            user_id=user1.id,
            book_copy_id=all_copies[0].id,
            borrow_date=now - timedelta(days=20),
            due_date=now - timedelta(days=6),  # 6 days overdue!
            status="active"
        )
        db.session.add(tx_overdue)
        
        # Active borrowing for user2 (Clean Code copy 1)
        all_copies[3].status = "borrowed"
        tx_active = BorrowingTransaction(
            user_id=user2.id,
            book_copy_id=all_copies[3].id,
            borrow_date=now - timedelta(days=4),
            due_date=now + timedelta(days=10),
            status="active"
        )
        db.session.add(tx_active)
        
        # Completed returned transaction for user3 (Meditations copy 1)
        tx_returned = BorrowingTransaction(
            user_id=user3.id,
            book_copy_id=all_copies[9].id,
            borrow_date=now - timedelta(days=30),
            due_date=now - timedelta(days=16),
            returned_date=now - timedelta(days=17),
            status="returned"
        )
        db.session.add(tx_returned)
        
        # Pending borrow request from user3 for Sapiens copy 1
        all_copies[5].status = "reserved"
        borrow_req = BorrowingRequest(
            user_id=user3.id,
            book_copy_id=all_copies[5].id,
            status="pending",
            requested_duration_days=14,
            request_date=now - timedelta(hours=3)
        )
        db.session.add(borrow_req)
        
        # Return request pending from user2 for an active book
        all_copies[11].status = "borrowed"
        tx_return_pending = BorrowingTransaction(
            user_id=user2.id,
            book_copy_id=all_copies[11].id,
            borrow_date=now - timedelta(days=10),
            due_date=now + timedelta(days=4),
            status="return_pending"
        )
        db.session.add(tx_return_pending)
        db.session.flush()
        
        return_req = ReturnRequest(
            transaction_id=tx_return_pending.id,
            user_id=user2.id,
            condition_notes="Read carefully, in pristine condition.",
            status="pending",
            request_date=now - timedelta(hours=2)
        )
        db.session.add(return_req)
        
        # 5. Book Donations
        print("Creating donations...")
        d1 = Donation(
            user_id=user1.id,
            title="The Hobbit",
            author="J.R.R. Tolkien",
            category_name="Fiction & Literature",
            condition="Like New",
            description="Special hardcover edition with fold-out map of Middle-earth.",
            cover_image="https://images.unsplash.com/photo-1629992101753-56d196c8addf?auto=format&fit=crop&q=80&w=600",
            status="pending",
            created_at=now - timedelta(days=1)
        )
        d2 = Donation(
            user_id=user2.id,
            title="Cosmos",
            author="Carl Sagan",
            category_name="Science & Technology",
            condition="Good",
            description="Classic exploration of science and the universe.",
            cover_image="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600",
            status="approved",
            admin_notes="Approved and queued for circulation.",
            created_at=now - timedelta(days=5),
            reviewed_at=now - timedelta(days=4)
        )
        d3 = Donation(
            user_id=user3.id,
            title="Outdated Tax Handbook 2004",
            author="Unknown",
            category_name="Science & Technology",
            condition="Fair",
            description="Old financial guidelines.",
            status="rejected",
            admin_notes="Outdated technical reference not suitable for public catalog.",
            created_at=now - timedelta(days=8),
            reviewed_at=now - timedelta(days=7)
        )
        db.session.add_all([d1, d2, d3])
        
        # 6. Book Exchanges
        print("Creating exchange listings & offers...")
        ex1 = ExchangeListing(
            user_id=user1.id,
            title="Brave New World",
            author="Aldous Huxley",
            category="Fiction & Literature",
            condition="Good",
            description="Paperback in great shape. No highlights or markings.",
            cover_image="https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600",
            looking_for="Looking for 1984, Fahrenheit 451, or classic dystopian novels.",
            status="available",
            created_at=now - timedelta(days=2)
        )
        
        ex2 = ExchangeListing(
            user_id=user2.id,
            title="Atomic Habits",
            author="James Clear",
            category="Philosophy & Thought",
            condition="Like New",
            description="Read once, practically brand new. Great insights on building positive daily routines.",
            cover_image="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=600",
            looking_for="Deep Work by Cal Newport or Thinking Fast and Slow.",
            status="available",
            created_at=now - timedelta(days=3)
        )
        
        ex3 = ExchangeListing(
            user_id=user3.id,
            title="Guns, Germs, and Steel",
            author="Jared Diamond",
            category="History & Biography",
            condition="Fair",
            description="Well-read copy with minor shelf wear on spine.",
            cover_image="https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&q=80&w=600",
            looking_for="Any world history or anthropology titles.",
            status="exchanged",
            created_at=now - timedelta(days=12)
        )
        
        db.session.add_all([ex1, ex2, ex3])
        db.session.flush()
        
        # Offer on ex1 from user2
        req_ex1 = ExchangeRequest(
            listing_id=ex1.id,
            proposer_id=user2.id,
            offered_title="Fahrenheit 451",
            offered_author="Ray Bradbury",
            offered_condition="Good",
            message="Hi Sarah! I noticed you are looking for classic dystopian fiction. I have Fahrenheit 451 in solid condition and would love to exchange for Brave New World!",
            status="pending",
            created_at=now - timedelta(hours=14)
        )
        
        # Completed request on ex3 from user1
        req_ex3 = ExchangeRequest(
            listing_id=ex3.id,
            proposer_id=user1.id,
            offered_title="The Silk Roads: A New History of the World",
            offered_author="Peter Frankopan",
            offered_condition="Like New",
            message="I'd love to swap my Silk Roads copy for Guns, Germs, and Steel.",
            status="accepted",
            created_at=now - timedelta(days=10),
            updated_at=now - timedelta(days=9)
        )
        db.session.add_all([req_ex1, req_ex3])
        
        # 7. Notifications
        print("Creating notifications...")
        n1 = Notification(
            user_id=user1.id,
            title="Overdue Notice ⚠️",
            message="Your borrow of 'To Kill a Mockingbird' is 6 days overdue. Please submit a return request soon.",
            type="warning",
            link="/profile?tab=borrowing"
        )
        n2 = Notification(
            user_id=user1.id,
            title="New Exchange Proposal! 🔄",
            message="Marcus Sterling offered 'Fahrenheit 451' for your 'Brave New World'!",
            type="info",
            link="/profile?tab=exchanges"
        )
        n3 = Notification(
            user_id=user2.id,
            title="Book Donation Approved! 🎉",
            message="Your donation of 'Cosmos' by Carl Sagan was approved by the librarian.",
            type="success",
            link="/profile?tab=donations"
        )
        n4 = Notification(
            user_id=user3.id,
            title="Welcome to BookBridge! 📚",
            message="Explore the catalog, borrow books, and engage with the community library.",
            type="info",
            link="/library"
        )
        db.session.add_all([n1, n2, n3, n4])
        
        # 8. Book Reviews
        print("Creating sample reviews...")
        reviews_data = [
            BookReview(user_id=user1.id, book_id=created_books[0].id, rating=5, review_text="A timeless American classic. Harper Lee's prose is unforgettable — it changed my perspective on justice and empathy."),
            BookReview(user_id=user2.id, book_id=created_books[0].id, rating=4, review_text="Beautifully written. Scout's narrative voice is charming and poignant. Required reading for everyone."),
            BookReview(user_id=user3.id, book_id=created_books[1].id, rating=5, review_text="Robert Martin fundamentally changed how I think about writing software. Every developer should read this at least once."),
            BookReview(user_id=user1.id, book_id=created_books[1].id, rating=4, review_text="Dense but rewarding. The examples are in Java but the principles apply universally. Some sections feel repetitive."),
            BookReview(user_id=user2.id, book_id=created_books[2].id, rating=5, review_text="Harari's ability to synthesize 70,000 years of human history into a compelling narrative is absolutely mind-blowing."),
            BookReview(user_id=user1.id, book_id=created_books[3].id, rating=5, review_text="Marcus Aurelius wrote this for himself, not for publication — that authenticity makes it even more powerful."),
            BookReview(user_id=user3.id, book_id=created_books[5].id, rating=5, review_text="Read this to my students every year. The Little Prince speaks to adults far more deeply than any children's book should."),
            BookReview(user_id=user2.id, book_id=created_books[6].id, rating=5, review_text="Still terrifyingly relevant 75 years later. Orwell's vision of totalitarianism and surveillance is prophetic."),
        ]
        db.session.add_all(reviews_data)

        # 9. Reading List Entries
        print("Creating reading list entries...")
        rl_data = [
            ReadingList(user_id=user1.id, book_id=created_books[2].id, list_type='wishlist'),
            ReadingList(user_id=user1.id, book_id=created_books[6].id, list_type='favorites'),
            ReadingList(user_id=user2.id, book_id=created_books[3].id, list_type='currently_reading'),
            ReadingList(user_id=user2.id, book_id=created_books[5].id, list_type='wishlist'),
            ReadingList(user_id=user3.id, book_id=created_books[0].id, list_type='favorites'),
            ReadingList(user_id=user3.id, book_id=created_books[7].id, list_type='wishlist'),
        ]
        db.session.add_all(rl_data)
        
        db.session.commit()
        print("Database successfully seeded with realistic library records!")

if __name__ == '__main__':
    seed_database()
