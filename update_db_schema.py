
import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'backend', 'tracker.db')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Update Classrooms table
    print("Migrating Classrooms table...")
    try:
        cursor.execute("ALTER TABLE classrooms ADD COLUMN semester TEXT")
    except sqlite3.OperationalError:
        print("Column 'semester' already exists")
    
    try:
        cursor.execute("ALTER TABLE classrooms ADD COLUMN year TEXT")
    except sqlite3.OperationalError:
        print("Column 'year' already exists")
        
    try:
        cursor.execute("ALTER TABLE classrooms ADD COLUMN faculty_name TEXT")
    except sqlite3.OperationalError:
        print("Column 'faculty_name' already exists")

    try:
        cursor.execute("ALTER TABLE classrooms ADD COLUMN faculty_email TEXT")
    except sqlite3.OperationalError:
        print("Column 'faculty_email' already exists")

    # 2. Update Student table for archiving (using existing status, but ensure it's used correctly)
    # The requirement is: "archives their details in the database for historical records"
    # We will use 'status' = 'archived' for this. No schema change needed there if status exists.
    # But let's check if we want a separate 'is_archived' flag. 
    # Current Student model has 'status'. We will stick to that.
    
    # 3. Update Assignment table for "link field"
    print("Migrating Assignments table...")
    try:
        cursor.execute("ALTER TABLE assignments ADD COLUMN response_link TEXT")
    except sqlite3.OperationalError:
        print("Column 'response_link' already exists")

    # 4. Update Classrooms table for department and batch
    print("Migrating Classrooms table (Dept/Batch)...")
    try:
        cursor.execute("ALTER TABLE classrooms ADD COLUMN department TEXT")
    except sqlite3.OperationalError:
        print("Column 'department' already exists")
    
    try:
        cursor.execute("ALTER TABLE classrooms ADD COLUMN batch TEXT")
    except sqlite3.OperationalError:
        print("Column 'batch' already exists")

    # 5. Create Semester Archives table
    print("Creating semester_archives table...")
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS semester_archives (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                department TEXT,
                batch TEXT,
                semester TEXT,
                start_date TEXT,
                end_date TEXT,
                title TEXT,
                notes TEXT,
                snapshot_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(department, batch, semester)
            )
        """)
    except sqlite3.OperationalError as e:
        print(f"Error creating table: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
