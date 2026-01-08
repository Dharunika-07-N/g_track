import sqlite3

def fix_db():
    conn = sqlite3.connect('backend/tracker.db')
    cur = conn.cursor()
    
    # Get all students
    cur.execute("SELECT id, github_username FROM students")
    students = cur.fetchall()
    
    for sid, username in students:
        if not username:
            print(f"Deleting empty user ID {sid}")
            cur.execute("DELETE FROM students WHERE id = ?", (sid,))
            continue
            
        clean = username.strip().rstrip('/')
        if '/' in clean:
            clean = clean.split('/')[-1]
            
        if clean != username:
            print(f"Updating {username} -> {clean}")
            cur.execute("UPDATE students SET github_username = ? WHERE id = ?", (clean, sid))
    
    conn.commit()
    print("Database fix complete.")
    conn.close()

if __name__ == "__main__":
    fix_db()
