import sqlite3

conn = sqlite3.connect('bookbridge.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
tables = [row[0] for row in cursor.fetchall() if not row[0].startswith('sqlite_')]

print(f"=== DATABASE INTEGRITY REPORT ({len(tables)} TABLES) ===")
print("-" * 75)
print(f"{'Table Name':<25} | {'Records':<8} | {'Columns':<8} | {'Indexes':<8}")
print("-" * 75)

for t in tables:
    cursor.execute(f"PRAGMA table_info({t});")
    cols = cursor.fetchall()
    cursor.execute(f"SELECT count(*) FROM {t};")
    count = cursor.fetchone()[0]
    cursor.execute(f"PRAGMA index_list({t});")
    indexes = cursor.fetchall()
    print(f"{t:<25} | {count:<8} | {len(cols):<8} | {len(indexes):<8}")

print("-" * 75)
print("Foreign key status:")
cursor.execute("PRAGMA foreign_key_check;")
fk_errors = cursor.fetchall()
if not fk_errors:
    print("[OK] All Foreign Key constraints are 100% VALID & HEALTHY.")
else:
    print("Foreign key errors found:", fk_errors)

conn.close()
