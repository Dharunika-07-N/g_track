import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(BASE_DIR, 'backend', 'tracker.db')

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add is_archived to classrooms if missing
        cursor.execute("ALTER TABLE classrooms ADD COLUMN is_archived BOOLEAN DEFAULT 0")
        print("Added is_archived to classrooms")
    except sqlite3.OperationalError:
        print("is_archived already exists or table missing")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
