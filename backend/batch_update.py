"""
Run this script to update ALL 57 students with correct data for Dec 1, 2025 - Jan 21, 2026
Place this in your backend folder and run: python batch_update.py
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, Student
from services.tracker import tracker_service
from datetime import datetime
import pandas as pd

# Date range
START_DATE = "2025-12-01"
END_DATE = "2026-01-21"

async def update_single_student(student_id: int, username: str):
    """Update a single student's data"""
    try:
        print(f"\n{'='*70}")
        print(f"Updating: {username} (ID: {student_id})")
        print(f"{'='*70}")
        
        # Fetch fresh data from GitHub
        stats = await tracker_service.get_complete_student_stats(
            username=username,
            start_date=START_DATE,
            end_date=END_DATE,
            period="custom"
        )
        
        # Update database
        db = SessionLocal()
        try:
            student = db.query(Student).filter(Student.id == student_id).first()
            if student:
                student.total_commits = stats["total_commits"]
                student.pull_requests = stats["pull_requests"]
                student.repo_count = stats["repo_count"]
                student.active_days = stats["active_days"]
                student.activity_score = stats["activity_score"]
                student.last_updated = datetime.utcnow()
                
                db.commit()
                print(f"✅ Updated database for {username}")
            else:
                print(f"⚠️ Student ID {student_id} not found in database")
        finally:
            db.close()
        
        return stats
        
    except Exception as e:
        print(f"❌ Error updating {username}: {e}")
        return None

async def main():
    print("\n" + "="*70)
    print("BATCH UPDATE: ALL STUDENTS")
    print(f"Date Range: {START_DATE} to {END_DATE}")
    print("="*70 + "\n")
    
    # Get all students from database
    db = SessionLocal()
    try:
        students = db.query(Student).all()
        print(f"📋 Found {len(students)} students in database\n")
        
        if not students:
            print("❌ No students found in database!")
            return
        
        # Create list of students to update
        student_data = [(s.id, s.github_username) for s in students if s.github_username]
        print(f"📋 {len(student_data)} students have GitHub usernames\n")
        
    finally:
        db.close()
    
    # Update all students
    results = []
    total = len(student_data)
    
    for idx, (student_id, username) in enumerate(student_data, 1):
        print(f"\n[{idx}/{total}] Processing {username}...")
        
        stats = await update_single_student(student_id, username)
        if stats:
            results.append({
                'id': student_id,
                'username': username,
                'commits': stats['total_commits'],
                'prs': stats['pull_requests'],
                'active_days': stats['active_days'],
                'score': stats['activity_score']
            })
        
        # Small delay between students to be nice to GitHub
        if idx < total:
            print(f"⏸️ Waiting 3 seconds before next student...")
            await asyncio.sleep(3)
    
    # Display summary
    print("\n" + "="*70)
    print("UPDATE COMPLETE - SUMMARY")
    print("="*70)
    
    if results:
        # Sort by score
        results.sort(key=lambda x: x['score'], reverse=True)
        
        print(f"\n🏆 TOP 15 CONTRIBUTORS:")
        print(f"{'Rank':<6} {'Username':<25} {'Commits':<10} {'PRs':<8} {'Days':<8} {'Score':<10}")
        print("-"*70)
        
        for rank, r in enumerate(results[:15], 1):
            print(f"{rank:<6} {r['username']:<25} {r['commits']:<10} {r['prs']:<8} {r['active_days']:<8} {r['score']:<10}")
        
        # Save to CSV
        df = pd.DataFrame(results)
        df.insert(0, 'rank', range(1, len(results) + 1))
        
        csv_file = f'updated_students_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        df.to_csv(csv_file, index=False)
        print(f"\n✅ Full results saved to: {csv_file}")
        
        top_15_file = 'top_15_final.csv'
        df.head(15).to_csv(top_15_file, index=False)
        print(f"✅ Top 15 saved to: {top_15_file}")
    else:
        print("❌ No successful updates")
    
    print("\n" + "="*70)
    print("✅ BATCH UPDATE FINISHED")
    print("="*70 + "\n")

if __name__ == "__main__":
    # Check if token is configured
    if not tracker_service.token:
        print("❌ ERROR: GITHUB_TOKEN not found in .env file!")
        print("Please add your GitHub token to backend/.env")
        sys.exit(1)
    
    print(f"✅ GitHub token found: {tracker_service.token[:4]}...{tracker_service.token[-4:]}")
    
    # Run the update
    asyncio.run(main())