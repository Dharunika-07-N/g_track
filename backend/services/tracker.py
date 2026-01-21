import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import os
from dotenv import load_dotenv
import asyncio

load_dotenv()

class GitHubTracker:
    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("GITHUB_TOKEN")
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GithubActivityTracker/1.0"
        }
        self.search_headers = {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.cloak-preview+json",  # Required for commit search
            "User-Agent": "GithubActivityTracker/1.0"
        }
    
    async def get_owned_repo_count(self, username: str) -> int:
        """Gets only owned repos (not forks)."""
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
                all_repos = []
                page = 1
                
                # GitHub paginates at 100 per page, we need to fetch all pages
                while True:
                    resp = await client.get(
                        f"{self.base_url}/users/{username}/repos",
                        params={"type": "owner", "per_page": 100, "page": page}
                    )
                    
                    if resp.status_code != 200:
                        break
                    
                    repos = resp.json()
                    if not repos:  # No more repos
                        break
                    
                    all_repos.extend(repos)
                    page += 1
                    
                    # Safety check to avoid infinite loops
                    if page > 10:  # Max 1000 repos
                        break
                
                # Exclude forks
                owned_repos = [repo for repo in all_repos if not repo.get("fork")]
                return len(owned_repos)
                
        except Exception as e:
            print(f"Error fetching repos for {username}: {e}")
            return 0
    
    async def get_commit_count_for_period(
        self, 
        username: str, 
        start_date: str,  # Format: YYYY-MM-DD
        end_date: str = None  # Format: YYYY-MM-DD
    ) -> int:
        """
        Gets accurate commit count using Search API.
        IMPORTANT: This only counts commits where the user is the AUTHOR.
        """
        if not self.token:
            return 0
        
        try:
            async with httpx.AsyncClient(headers=self.search_headers, timeout=15.0) as client:
                # Build the search query
                if not end_date:
                    end_date = datetime.utcnow().strftime("%Y-%m-%d")
                
                # GitHub Search API uses author-date (when commit was originally made)
                query = f"author:{username} author-date:{start_date}..{end_date}"
                
                resp = await client.get(
                    f"{self.base_url}/search/commits",
                    params={"q": query, "per_page": 1}  # We only need the count
                )
                
                if resp.status_code == 200:
                    return resp.json().get("total_count", 0)
                elif resp.status_code == 422:
                    print(f"Invalid date range for {username}: {start_date} to {end_date}")
                    return 0
                else:
                    print(f"Search API error {resp.status_code} for {username}")
                    return 0
                    
        except Exception as e:
            print(f"Error fetching commits for {username}: {e}")
            return 0
    
    async def get_pull_request_count(
        self,
        username: str,
        start_date: str,
        end_date: str = None
    ) -> int:
        """Gets PR count using Search API."""
        if not self.token:
            return 0
        
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=15.0) as client:
                if not end_date:
                    end_date = datetime.utcnow().strftime("%Y-%m-%d")
                
                # Search for PRs created by this user
                query = f"author:{username} type:pr created:{start_date}..{end_date}"
                
                resp = await client.get(
                    f"{self.base_url}/search/issues",
                    params={"q": query, "per_page": 1}
                )
                
                if resp.status_code == 200:
                    return resp.json().get("total_count", 0)
                else:
                    return 0
                    
        except Exception as e:
            print(f"Error fetching PRs for {username}: {e}")
            return 0
    
    async def get_daily_commit_counts(
        self,
        username: str,
        days: int = 7
    ) -> Dict[str, int]:
        """
        Gets daily commit counts for the last N days.
        Returns dict with date as key and count as value.
        """
        daily_counts = {}
        
        for i in range(days):
            date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
            count = await self.get_commit_count_for_period(username, date, date)
            daily_counts[date] = count
        
        return daily_counts
    
    async def get_active_days_count(
        self,
        username: str,
        start_date: str,
        end_date: str = None
    ) -> int:
        """
        Counts the number of days user had at least 1 commit.
        """
        if not end_date:
            end_date = datetime.utcnow().strftime("%Y-%m-%d")
        
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            return 0
        
        active_days = 0
        current = start
        
        # Limit to prevent excessive API calls
        max_days = 90 # Increased from whatever but keeping it reasonable
        days_checked = 0
        
        # This is indeed expensive. In a production app we'd want to optimize this.
        while current <= end and days_checked < max_days:
            date_str = current.strftime("%Y-%m-%d")
            count = await self.get_commit_count_for_period(username, date_str, date_str)
            
            if count > 0:
                active_days += 1
            
            current += timedelta(days=1)
            days_checked += 1
        
        return active_days
    
    async def get_complete_student_stats(
        self,
        username: str,
        period: str = "all"  # "all", "year", "month", "week"
    ) -> Dict:
        """
        Gets complete stats for a student with proper time filtering.
        """
        # Calculate date ranges based on period
        now = datetime.utcnow()
        end_date = now.strftime("%Y-%m-%d")
        
        if period == "week":
            start_date = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        elif period == "month":
            start_date = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        elif period == "year":
            start_date = (now - timedelta(days=365)).strftime("%Y-%m-%d")
        else:  # "all"
            start_date = "2020-01-01"
        
        # Fetch data in parallel
        commits, prs, repos = await asyncio.gather(
            self.get_commit_count_for_period(username, start_date, end_date),
            self.get_pull_request_count(username, start_date, end_date),
            self.get_owned_repo_count(username)
        )
        
        # For active days, only calculate for limited periods (expensive!)
        if period in ["week", "month"]:
            active_days = await self.get_active_days_count(username, start_date, end_date)
        else:
            # For long periods, estimate based on commits or use a default
            active_days = min(commits, 365)
        
        # Calculate activity score
        activity_score = (commits * 2) + (prs * 3) + (active_days * 1)
        
        return {
            "username": username,
            "total_commits": commits,
            "pull_requests": prs,
            "repo_count": repos,
            "active_days": active_days,
            "activity_score": activity_score,
            "period": period,
            "start_date": start_date,
            "end_date": end_date
        }

    # Keep compatibility with existing code where necessary
    async def analyze_user(self, username: str) -> Dict:
        # This is a legacy method, we'll map it to get_complete_student_stats
        stats = await self.get_complete_student_stats(username, period="year")
        # Fetch avatar and profile info manually since we need it for UI
        async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/users/{username}")
            user_info = resp.json() if resp.status_code == 200 else {}
        
        return {
            "username": username,
            "name": user_info.get("name") or username,
            "avatar_url": user_info.get("avatar_url"),
            "profile_url": user_info.get("html_url"),
            "stats": stats
        }

tracker_service = GitHubTracker()
