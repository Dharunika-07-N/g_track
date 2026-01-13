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
            
            # Get all table names
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            
            # Tables to clear
            # We skip 'alembic_version' to maintain migration state
            # We can also clear 'users' if we want a full reset, 
            # as main.py will recreate the 'admin' user.
            
            for table_tuple in tables:
                table = table_tuple[0]
                if table == 'alembic_version':
                    continue
                
                print(f"Clearing table: {table}")
                cursor.execute(f"DELETE FROM {table}")
                # Reset auto-increment counters
                cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table}'")
            
            conn.commit()
            conn.close()
            print("\nDatabase data cleared successfully.")
            print("All students, classrooms, assignments, and archives have been removed.")
            print("The system will recreate the default instructor account on next startup.")
        except Exception as e:
            print(f"Error clearing database: {e}")
    else:
        print(f"Database file not found at {db_path}")

if __name__ == "__main__":
    reset_db()
