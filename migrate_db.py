import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(BASE_DIR, 'backend', 'tracker.db')

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Classrooms migrations
    try:
        cursor.execute("ALTER TABLE classrooms ADD COLUMN is_archived BOOLEAN DEFAULT 0")
        print("Added is_archived to classrooms")
    except sqlite3.OperationalError:
        pass
        
    # Students migrations
    cols_to_add = [
        ("student_id", "VARCHAR"),
        ("email", "VARCHAR"),
        ("classroom_id", "INTEGER"),
        ("enrollment_date", "DATETIME"),
        ("status", "VARCHAR DEFAULT 'active'")
    ]
    
    for col_name, col_type in cols_to_add:
        try:
            cursor.execute(f"ALTER TABLE students ADD COLUMN {col_name} {col_type}")
            print(f"Added {col_name} to students")
        except sqlite3.OperationalError:
            print(f"{col_name} already exists in students")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
