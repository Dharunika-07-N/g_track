import sqlite3
import os

db_path = os.path.join('backend', 'tracker.db')
if not os.path.exists(db_path):
    print("DB not found")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT github_username FROM students WHERE github_username IS NOT NULL AND github_username != ''")
    rows = cursor.fetchall()
    usernames = [r[0] for r in rows]
    print(f"Total found: {len(usernames)}")
    print(", ".join(usernames))
    conn.close()
