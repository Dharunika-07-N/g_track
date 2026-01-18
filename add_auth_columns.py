import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'backend', 'tracker.db')

def migrate_auth():
    print(f"Migrating auth columns to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Update Users table
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
        print("Added password_hash to users")
    except sqlite3.OperationalError:
        print("users.password_hash already exists")

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'")
        print("Added role to users")
    except sqlite3.OperationalError:
        print("users.role already exists")

    # 2. Update Students table
    try:
        cursor.execute("ALTER TABLE students ADD COLUMN password_hash TEXT")
        print("Added password_hash to students")
    except sqlite3.OperationalError:
        print("students.password_hash already exists")

    conn.commit()
    conn.close()
    print("Auth migration complete.")

if __name__ == "__main__":
    migrate_auth()
