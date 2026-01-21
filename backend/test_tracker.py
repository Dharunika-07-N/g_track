"""
Quick test script to verify the fixed tracker works correctly.
Usage: python test_tracker.py
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.tracker import tracker_service

# Test configuration
START_DATE = "2025-12-01"
END_DATE = "2026-01-21"

# Test with a few known GitHub usernames
TEST_USERNAMES = [
    "Gopikagovind",
    "rdharshinir",
]

async def test_single_user(username: str):
    """Test fetching data for a single user"""
    print(f"\n{'='*70}")
    print(f"Testing: {username}")
    print(f"Date Range: {START_DATE} to {END_DATE}")
    print(f"{'='*70}\n")
    
    try:
        stats = await tracker_service.get_complete_student_stats(
            username=username,
            start_date=START_DATE,
            end_date=END_DATE,
            period="custom"
        )
        
        print("✅ SUCCESS! Retrieved stats:")
        print(f"   Commits: {stats['total_commits']}")
        print(f"   PRs: {stats['pull_requests']}")
        print(f"   Active Days: {stats['active_days']}")
        print(f"   Repos: {stats['repo_count']}")
        print(f"   Activity Score: {stats['activity_score']}")
        
        # Verify calculation
        expected_score = (stats['total_commits'] * 2) + (stats['pull_requests'] * 3) + (stats['active_days'] * 1)
        if expected_score == stats['activity_score']:
            print("   ✅ Score calculation is CORRECT")
        else:
            print(f"   ⚠️ Score mismatch! Expected {expected_score}, got {stats['activity_score']}")
        
        return stats
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return None

async def main():
    print("\n" + "="*70)
    print("GITHUB TRACKER - TEST SUITE")
    print("="*70)
    
    if not tracker_service.token:
        print("\n❌ ERROR: GITHUB_TOKEN not found!")
        return
    
    print(f"\n✅ GitHub Token: {tracker_service.token[:4]}...{tracker_service.token[-4:]}")
    print(f"✅ Date Range: {START_DATE} to {END_DATE}\n")
    
    results = []
    for idx, username in enumerate(TEST_USERNAMES, 1):
        print(f"\n[{idx}/{len(TEST_USERNAMES)}]")
        stats = await test_single_user(username)
        if stats:
            results.append(stats)
        
        if idx < len(TEST_USERNAMES):
            print(f"\n⏸️ Waiting 2 seconds before next test...")
            await asyncio.sleep(2)
    
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"Total Tested: {len(TEST_USERNAMES)}")
    print(f"Successful: {len(results)}")
    
    if results:
        print("\n✅ All tests passed! The tracker is working correctly.")
    else:
        print("\n❌ Tests failed.")

if __name__ == "__main__":
    asyncio.run(main())