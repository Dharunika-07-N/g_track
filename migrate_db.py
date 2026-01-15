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

    classroom_cols = [
        ("department", "VARCHAR"),
        ("batch", "VARCHAR"),
        ("faculty_name", "VARCHAR"),
        ("faculty_email", "VARCHAR"),
        ("semester", "VARCHAR"),
        ("year", "VARCHAR"),
        ("subject_code", "VARCHAR"),
        ("term", "VARCHAR")
    ]

    for col_name, col_type in classroom_cols:
        try:
            cursor.execute(f"ALTER TABLE classrooms ADD COLUMN {col_name} {col_type}")
            print(f"Added {col_name} to classrooms")
        except sqlite3.OperationalError:
            print(f"{col_name} already exists in classrooms")

    # Assignments migrations
    assignment_cols = [
        ("visibility", "BOOLEAN DEFAULT 1"),
        ("late_policy", "VARCHAR"),
        ("repo_prefix", "VARCHAR"),
        ("starter_code_url", "VARCHAR"),
        ("response_link", "VARCHAR"),
        ("google_sheet_url", "VARCHAR"),
        ("config", "VARCHAR") # JSON
    ]
    
    for col_name, col_type in assignment_cols:
        try:
            cursor.execute(f"ALTER TABLE assignments ADD COLUMN {col_name} {col_type}")
            print(f"Added {col_name} to assignments")
        except sqlite3.OperationalError:
            print(f"{col_name} already exists in assignments")

    # Submissions migrations
    submission_cols = [
        ("autograde_score", "INTEGER"),
        ("manual_score", "INTEGER")
    ]
    
    for col_name, col_type in submission_cols:
        try:
            cursor.execute(f"ALTER TABLE submissions ADD COLUMN {col_name} {col_type}")
            print(f"Added {col_name} to submissions")
        except sqlite3.OperationalError:
            print(f"{col_name} already exists in submissions")
        
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
