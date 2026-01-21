
"""
Script to apply manual contribution updates from the verified image.
Period: 2026-01-01 to 2026-01-21
"""
import sys
import os
from datetime import datetime
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, Student
import pandas as pd

# Data extracted from the USER's image
MANUAL_DATA = [
    {"username": "Mrvatsan", "commits": 159},
    {"username": "Rithish4610", "commits": 142},
    {"username": "Ranjithkumartech1130", "commits": 134},
    {"username": "Dharunika-07-N", "commits": 112},
    {"username": "sowmya2006-s", "commits": 60},
    {"username": "niveda1704", "commits": 49},
    {"username": "Madura2024", "commits": 49},
    {"username": "rithika5656", "commits": 46},
    {"username": "ManujanaNagaraj", "commits": 40},
    {"username": "Santhiya2007-a", "commits": 40},
    {"username": "Archana487", "commits": 36},
    {"username": "ShakthiRithanya", "commits": 33},
    {"username": "Shwetha1222007", "commits": 31},
    {"username": "abishek003-tech", "commits": 29},
    {"username": "Sandhya-1626", "commits": 26},
    {"username": "Mithraa-N", "commits": 26}
]

def apply_updates():
    db = SessionLocal()
    updated_results = []
    
    print("\n" + "="*50)
    print("APPLYING MANUAL CONTRIBUTIONS DATA")
    print("="*50)
    
    try:
        for entry in MANUAL_DATA:
            username = entry["username"]
            commits = entry["commits"]
            
            # Find student by username (case-insensitive)
            student = db.query(Student).filter(Student.github_username.ilike(username)).first()
            
            if student:
                # We assume manual contributions are the 'commits' count for this specific period
                student.total_commits = commits
                # Since we don't have PR/Active Day breakdown for the manual count, 
                # we'll use a simplified score: (Contributions * 2) 
                # or just set score = commits if that's the metric being used.
                # To maintain consistency with the score formula, we'll estimate:
                # Score = Commits * 2 (assuming minimal PRs for rank purposes)
                student.activity_score = commits * 2 
                student.last_updated = datetime.utcnow()
                
                print(f"✅ Updated {username}: {commits} contributions")
                
                updated_results.append({
                    "Rank": 0, # Will sort later
                    "Username": username,
                    "Github_ID": f"https://github.com/{username}",
                    "Contributions": commits,
                    "Score": student.activity_score
                })
            else:
                print(f"⚠️ Student not found in DB: {username}")
        
        db.commit()
        
        # Generate the Final CSV
        df = pd.DataFrame(updated_results)
        df = df.sort_values(by="Contributions", ascending=False)
        df["Rank"] = range(1, len(df) + 1)
        
        final_file = "manual_verified_top_16.csv"
        df[["Rank", "Username", "Contributions", "Score", "Github_ID"]].to_csv(final_file, index=False)
        
        print("\n" + "="*50)
        print(f"SUCCESS! Database updated.")
        print(f"Final CSV saved to: {final_file}")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    apply_updates()
