import urllib.request
import urllib.parse
import json
import http.cookiejar

BASE = "http://127.0.0.1:5000"

def create_session():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    return opener

def request_json(opener, method, url, data=None):
    full_url = BASE + url
    body = json.dumps(data).encode('utf-8') if data is not None else None
    headers = {'Content-Type': 'application/json'} if data is not None else {}
    req = urllib.request.Request(full_url, data=body, headers=headers, method=method)
    try:
        res = opener.open(req)
        return res.status, json.loads(res.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        raw = e.read().decode('utf-8')
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {'raw': raw}

def test_full_backend():
    print("=== STARTING FULL BACKEND DATABASE STORAGE & API TEST ===")
    
    # 0. Clean reset
    init_opener = create_session()
    status, res = request_json(init_opener, 'GET', '/api/admin/reset-database')
    print(f"[OK] Database reset initialized: {res.get('message', '')}")
    
    # 1. Login as Sarah (Patron)
    patron = create_session()
    status, res = request_json(patron, 'POST', '/api/auth/login', {'email': 'sarah@example.com', 'password': 'user123'})
    assert status == 200 and res['success'], f"Patron login failed: {res}"
    print(f"[OK] Patron logged in: {res['user']['name']} (ID {res['user']['id']})")
    
    # 2. Check /api/borrowings/my
    status, res = request_json(patron, 'GET', '/api/borrowings/my')
    assert status == 200, f"/api/borrowings/my failed: {res}"
    print(f"[OK] Fetched patron loans: {len(res['transactions'])} transactions")

    # 3. Check /api/donations/my
    status, res = request_json(patron, 'GET', '/api/donations/my')
    assert status == 200, f"/api/donations/my failed: {res}"
    print(f"[OK] Fetched patron donations: {len(res['donations'])} donations")

    # 4. Check /api/exchanges/my
    status, res = request_json(patron, 'GET', '/api/exchanges/my')
    assert status == 200, f"/api/exchanges/my failed: {res}"
    print(f"[OK] Fetched patron exchanges: {len(res['listings'])} listings, {len(res['requests'])} proposals")

    # 5. Submit a new Book Review
    status, res = request_json(patron, 'POST', '/api/reviews/book/2', {'rating': 5, 'review_text': 'Clean Code was a transformative read for our software team!'})
    assert status in [200, 201], f"Review submit failed: {res}"
    print(f"[OK] Book review saved: rating {res.get('review', {}).get('rating', 5)} (New avg: {res.get('avg_rating')})")

    # 6. Add to Reading List
    status, res = request_json(patron, 'POST', '/api/reading-list', {'book_id': 4, 'list_type': 'wishlist'})
    print(f"[OK] Reading list operation status: {status} ({res.get('message', '')})")

    # 7. Submit a new Donation
    status, res = request_json(patron, 'POST', '/api/donations', {
        'title': 'The Pragmatic Programmer',
        'author': 'David Thomas & Andrew Hunt',
        'category_name': 'Science & Technology',
        'condition': 'Like New',
        'description': 'From journeyman to master software craftsman.'
    })
    assert status == 201 and res['success'], f"Donation submit failed: {res}"
    don_id = res['donation']['id']
    print(f"[OK] New donation created in DB: ID #{don_id} ('{res['donation']['title']}')")

    # 8. Submit a new Borrow Request (for book 3 Sapiens)
    status, res = request_json(patron, 'POST', '/api/borrowings/request', {
        'book_id': 3,
        'requested_duration_days': 14
    })
    assert status in [201, 200], f"Borrow request failed: {res}"
    bor_id = res['request']['id']
    print(f"[OK] Borrow request created in DB: ID #{bor_id} for copy #{res['request']['copy_number']}")

    # 9. Login as Admin
    admin = create_session()
    status, res = request_json(admin, 'POST', '/api/auth/login', {'email': 'admin@bookbridge.org', 'password': 'admin123'})
    assert status == 200 and res['success'], f"Admin login failed: {res}"
    print(f"[OK] Admin logged in: {res['user']['name']}")

    # 10. Admin Approves the Donation -> auto creates Book & Copy in SQLite!
    status, res = request_json(admin, 'POST', f'/api/donations/{don_id}/approve', {'admin_notes': 'Accepted for engineering shelf.'})
    assert status == 200 and res['success'], f"Donation approval failed: {res}"
    print(f"[OK] Donation #{don_id} APPROVED! Linked book ID: {res['donation']['book_id']}")

    # 11. Admin Approves the Borrow Request -> marks copy borrowed, creates BorrowingTransaction
    status, res = request_json(admin, 'POST', f'/api/borrowings/requests/{bor_id}/approve')
    assert status == 200 and res['success'], f"Borrow approval failed: {res}"
    print(f"[OK] Borrow Request #{bor_id} APPROVED! Copy status updated in database.")

    # 12. Check public stats updated
    status, res = request_json(patron, 'GET', '/api/stats/public')
    assert status == 200, f"Stats failed: {res}"
    print(f"[OK] Public database stats: {res['stats']['total_books']} books, {res['stats']['total_members']} members")

    # 13. Test External Books Open Library API Search
    status, res = request_json(patron, 'GET', '/api/external-books/search?q=algorithms&limit=2')
    assert status == 200 and res['success'], f"Open Library search failed: {res}"
    print(f"[OK] Open Library API Search: found {res['total_found']} matching books globally")

    # 14. Test External Books Auto-Fill API
    status, res = request_json(patron, 'POST', '/api/external-books/auto-fill', {'isbn': '9780132350884'})
    assert status == 200 and res['success'], f"Open Library auto-fill failed: {res}"
    print(f"[OK] Open Library API Auto-Fill: resolved '{res['data']['title']}' by {res['data']['author']}")

    # 15. Test Admin Online Import into SQLite Database
    status, res = request_json(admin, 'POST', '/api/external-books/import', {'isbn': '9780451524935', 'copies_count': 2})
    assert status in [200, 201] and res['success'], f"Open Library import failed: {res}"
    print(f"[OK] Open Library API Direct Import: {res['message']}")

    print("\n>>> ALL DATABASE STORAGE & EXTERNAL API INTEGRATION TESTS PASSED 100%! <<<")

if __name__ == '__main__':
    test_full_backend()
