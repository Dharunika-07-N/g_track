# backend/test_tracker.py
import asyncio
import os
from services.tracker import GitHubTracker

async def test_tracker():
    # Use token from environment
    token = os.getenv("GITHUB_TOKEN")
    
    tracker = GitHubTracker(token=token)
    
    usernames = ["Dharunika-07-N", "KRITHIKA780", "Aishwaryaa-2007"]
    
    for username in usernames:
        print(f"\nTesting tracker for {username}...")
        try:
            stats = await tracker.get_complete_student_stats(username, period="all")
            
            print(f"--- Results for {username} ---")
            print(f"Commits: {stats['total_commits']}")
            print(f"Pull Requests: {stats['pull_requests']}")
            print(f"Repos (owned, no forks): {stats['repo_count']}")
            print(f"Active Days: {stats['active_days']}")
            print(f"Activity Score: {stats['activity_score']}")
            print(f"Link: https://github.com/{username}")
        except Exception as e:
            print(f"Error for {username}: {e}")

# Run the test
if __name__ == "__main__":
    # Handle Windows encoding issues for emojis if they were still there, 
    # but we removed them for simplicity.
    asyncio.run(test_tracker())
