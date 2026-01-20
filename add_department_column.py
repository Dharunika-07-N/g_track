"""
Add department column to students table

This script adds the missing department column to the students table
to prevent 500 errors during student upload operations.
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'backend', 'tracker.db')}"
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def add_department_column():
    """Add department column to students table if it doesn't exist"""
    with engine.connect() as conn:
        # Check if column exists
        if DATABASE_URL.startswith("sqlite"):
            result = conn.execute(text("PRAGMA table_info(students)"))
            columns = [row[1] for row in result]
            
            if 'department' not in columns:
                print("Adding department column to students table...")
                conn.execute(text("ALTER TABLE students ADD COLUMN department VARCHAR"))
                conn.commit()
                print("[SUCCESS] Department column added successfully!")
            else:
                print("[OK] Department column already exists")
        else:
            # PostgreSQL
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='students' AND column_name='department'
            """))
            
            if result.rowcount == 0:
                print("Adding department column to students table...")
                conn.execute(text("ALTER TABLE students ADD COLUMN department VARCHAR"))
                conn.commit()
                print("[SUCCESS] Department column added successfully!")
            else:
                print("[OK] Department column already exists")

if __name__ == "__main__":
    print("Starting database migration...")
    add_department_column()
    print("Migration complete!")
