import sqlite3
import os

def reset_db():
    # Get the directory of the current script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, 'tracker.db')

    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # 1. Clear tables related to student tracking
            tables_to_clear = [
                'activity_logs', 
                'submissions', 
                'students', 
                'classrooms', 
                'assignments', 
                'import_logs',
                'notifications',
                'assignment_reminder_logs',
                'feedbacks',
                'autograding_tests'
            ]
            
            for table in tables_to_clear:
                try:
                    print(f"Clearing table: {table}")
                    cursor.execute(f"DELETE FROM {table}")
                    # Reset auto-increment counters
                    cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table}'")
                except sqlite3.OperationalError:
                    print(f"Table {table} does not exist, skipping.")
            
            # 2. Clear ONLY student/faculty users, keep HODs/Admins
            print("Cleaning up users (keeping Admins/HODs)...")
            cursor.execute("DELETE FROM users WHERE role NOT IN ('admin', 'hod')")
            
            conn.commit()
            conn.close()
            print("\nDatabase data cleared successfully.")
            print("All students, classrooms, assignments, and logs have been removed.")
            print("Your HOD/Admin account has been PRESERVED.")
        except Exception as e:
            print(f"Error clearing database: {e}")
    else:
        print(f"Database file not found at {db_path}")


if __name__ == "__main__":
    reset_db()
