import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'bookbridge.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=== DATABASE TABLES & ROW COUNTS ===")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
tables = [row[0] for row in cursor.fetchall()]
for t in sorted(tables):
    cursor.execute(f"SELECT COUNT(*) FROM {t}")
    count = cursor.fetchone()[0]
    print(f"Table: {t:<26} Rows: {count}")

print("\n=== FOREIGN KEY INTEGRITY CHECK ===")
cursor.execute("PRAGMA foreign_key_check;")
errors = cursor.fetchall()
if not errors:
    print("Foreign Key Integrity: 100% CLEAN (0 violations)")
else:
    print("FK Violations found:", errors)

conn.close()
