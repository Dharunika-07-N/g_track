
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

columns_to_add = [
    ("department", "VARCHAR"),
    ("subject_name", "VARCHAR"),
    ("student_id", "VARCHAR"),
    ("phone", "VARCHAR"),
    ("leetcode_username", "VARCHAR"),
    ("hackerrank_username", "VARCHAR"),
    ("password_reset_required", "BOOLEAN DEFAULT FALSE"),
    ("import_batch_id", "VARCHAR")
]

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Check existing columns again to avoid duplicate errors
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users';")
    existing_columns = [row[0] for row in cur.fetchall()]
    
    for col_name, col_type in columns_to_add:
        if col_name not in existing_columns:
            print(f"Adding column {col_name}...")
            cur.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type};")
            
    conn.commit()
    
    # Students Table
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'students';")
    existing_student_columns = [row[0] for row in cur.fetchall()]
    
    student_columns_to_add = [
        ("password_hash", "VARCHAR"),
        ("department", "VARCHAR"),
        ("leetcode_solved", "INTEGER DEFAULT 0"),
        ("leetcode_rating", "INTEGER DEFAULT 0"),
        ("hackerrank_score", "INTEGER DEFAULT 0")
    ]
    
    for col_name, col_type in student_columns_to_add:
        if col_name not in existing_student_columns:
            print(f"Adding column {col_name} to students table...")
            cur.execute(f"ALTER TABLE students ADD COLUMN {col_name} {col_type};")
            
    conn.commit()

    # Departments Table - Remove unique constraint from code column
    print("Checking departments table uniqueness...")
    cur.execute("""
        SELECT count(*) 
        FROM information_schema.table_constraints 
        WHERE table_name='departments' AND constraint_type='UNIQUE' AND constraint_name='departments_code_key';
    """)
    if cur.fetchone()[0] > 0:
        print("Dropping unique constraint from departments(code)...")
        cur.execute("ALTER TABLE departments DROP CONSTRAINT departments_code_key;")
        conn.commit()
    
    # Also handle the index if SQLAlchemy created a separate one
    cur.execute("DROP INDEX IF EXISTS ix_departments_code;")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_departments_code ON departments(code);")
    conn.commit()

    print("Schema update completed successfully.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
