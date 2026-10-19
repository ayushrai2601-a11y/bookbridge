import urllib.request
import urllib.error
import json
import http.cookiejar

BASE = "http://127.0.0.1:5000"
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def post_json(path, data):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with opener.open(req) as res:
            return res.status, json.loads(res.read().decode('utf-8'))
    except urllib.error.HTTPError as he:
        return he.code, json.loads(he.read().decode('utf-8'))

def get_json(path):
    req = urllib.request.Request(f"{BASE}{path}")
    try:
        with opener.open(req) as res:
            return res.status, json.loads(res.read().decode('utf-8'))
    except urllib.error.HTTPError as he:
        return he.code, json.loads(he.read().decode('utf-8'))

def delete_json(path):
    req = urllib.request.Request(f"{BASE}{path}", method='DELETE')
    try:
        with opener.open(req) as res:
            return res.status, json.loads(res.read().decode('utf-8'))
    except urllib.error.HTTPError as he:
        return he.code, json.loads(he.read().decode('utf-8'))

print("=== STARTING GOOGLE SECURITY & TRUSTED PATRON TESTS ===")

# Test 1: Config endpoint
s, res = get_json('/api/auth/google/config')
print("1. Google Config:", s, res)
assert s == 200
assert res['trusted_only'] is True
assert 'gmail.com' in res['allowed_domains']
print("   [PASS] Google Config verified")

# Test 2: Reject non-Gmail domain
s, res = post_json('/api/auth/google', {'email': 'intruder@untrusted-external.net', 'name': 'Intruder'})
print("2. Untrusted Domain Check:", s, res.get('message'))
assert s == 403
assert 'not an authorized Google domain' in res['message']
print("   [PASS] Non-Gmail domain blocked")

# Test 3: Reject untrusted Gmail account
s, res = post_json('/api/auth/google', {'email': 'stranger999@gmail.com', 'name': 'Stranger'})
print("3. Untrusted Gmail Check:", s, res.get('message'))
assert s == 403
assert res.get('trusted_error') is True
assert 'trusted Google patrons list' in res['message']
print("   [PASS] Untrusted Gmail account rejected by whitelist")

# Test 4: Allow authorized trusted Gmail account
s, res = post_json('/api/auth/google', {'email': 'alex.reader@gmail.com', 'name': 'Alex Rivera'})
print("4. Authorized Trusted Gmail Check:", s, res.get('message'))
assert s == 200
assert res['success'] is True
assert res['user']['email'] == 'alex.reader@gmail.com'
print("   [PASS] Whitelisted Gmail patron authenticated successfully")

# Test 5: Verify Admin Management of Trusted Gmails
# Login as admin
s, res = post_json('/api/auth/login', {'email': 'admin@bookbridge.org', 'password': 'admin123'})
print("5a. Admin Login:", s, res.get('success'))
assert s == 200

# Get trusted gmails list
s, res = get_json('/api/admin/trusted-gmails')
print("5b. Admin Trusted Gmails count:", s, len(res.get('trusted_gmails', [])))
assert s == 200
trusted_emails = [g['email'] for g in res.get('trusted_gmails', [])]
assert 'alex.reader@gmail.com' in trusted_emails

# Admin adds a new trusted patron: 'dr.watson@gmail.com'
s, res = post_json('/api/admin/trusted-gmails', {
    'email': 'dr.watson@gmail.com',
    'name': 'Dr. John Watson',
    'notes': 'Medical Faculty & Literary Society'
})
print("5c. Admin Added Dr. Watson:", s, res.get('message'))
assert s == 200
new_id = res['trusted_gmail']['id']

# Logout admin
post_json('/api/auth/logout', {})

# Now Dr. Watson can sign in via Google!
s, res = post_json('/api/auth/google', {'email': 'dr.watson@gmail.com', 'name': 'Dr. John Watson'})
print("5d. Dr. Watson Sign-in:", s, res.get('message'))
assert s == 200
assert res['user']['email'] == 'dr.watson@gmail.com'
print("   [PASS] Newly authorized patron Dr. Watson signed in successfully!")

# Admin revokes Dr. Watson
post_json('/api/auth/login', {'email': 'admin@bookbridge.org', 'password': 'admin123'})
s, res = delete_json(f'/api/admin/trusted-gmails/{new_id}')
print("5e. Revoke Dr. Watson:", s, res.get('message'))
assert s == 200
print("   [PASS] Admin can revoke trusted patron access")

print("=== ALL GOOGLE SECURITY & TRUSTED PATRON TESTS PASSED 100% ===")
