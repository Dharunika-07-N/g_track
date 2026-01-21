import httpx
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Optional
import asyncio

import os
from dotenv import load_dotenv

load_dotenv()

class GitHubTracker:
    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("GITHUB_TOKEN")
        self.headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GithubActivityTracker/1.0'
        }
        if self.token:
            self.headers['Authorization'] = f'token {self.token}'
        self.base_url = 'https://api.github.com'
    
    async def get_user_info(self, client: httpx.AsyncClient, username: str) -> Dict:
        try:
            resp = await client.get(f"{self.base_url}/users/{username}")
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 404:
                return {"error": "User not found"}
            elif resp.status_code == 403:
                # Check for rate limiting
                if resp.headers.get("X-RateLimit-Remaining") == "0":
                    reset_time = resp.headers.get("X-RateLimit-Reset")
                    return {"error": "Rate limit exceeded", "reset_at": reset_time}
                return {"error": "Access forbidden"}
            return {"error": f"Status {resp.status_code}"}
        except Exception as e:
            return {"error": str(e)}

    async def get_user_events(self, client: httpx.AsyncClient, username: str, days: int = 365) -> List[Dict]:
        events = []
        page = 1
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        while True:
            try:
                endpoint = f"{self.base_url}/users/{username}/events" if self.token else f"{self.base_url}/users/{username}/events/public"
                resp = await client.get(
                    endpoint,
                    params={'page': page, 'per_page': 100}
                )
                
                if resp.status_code != 200:
                    break
                    
                data = resp.json()
                if not data:
                    break
                
                older_events_found = False
                for event in data:
                    created_at = datetime.strptime(event['created_at'], '%Y-%m-%dT%H:%M:%SZ')
                    if created_at >= cutoff:
                        events.append(event)
                    else:
                        older_events_found = True
                
                if older_events_found or len(data) < 100:
                    break
                
                page += 1
                if page > 10: # Increased safety break to get more events if available
                    break
            except Exception as e:
                print(f"Error fetching events: {e}")
                break
                
        return events

    async def analyze_user(self, username: str) -> Dict:
        async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
            user_info = await self.get_user_info(client, username)
            if "error" in user_info:
                return None
            
            # Fetch as much history as GitHub Events allows (usually 90 days)
            events = await self.get_user_events(client, username, days=365)
            
            stats = {
                "commits": 0,
                "pull_requests": 0,
                "issues": 0,
                "reviews": 0,
                "repos_contributed_to": set(),
                "total_events": len(events),
                "active_dates": set()
            }
            
            # Dictionary to store daily breakdowns: { 'YYYY-MM-DD': { 'commits': 0, ... } }
            daily_stats = defaultdict(lambda: {"commits": 0, "prs": 0, "issues": 0, "reviews": 0})
            
            for event in events:
                etype = event.get("type")
                repo_name = event.get("repo", {}).get("name")
                if repo_name:
                    stats["repos_contributed_to"].add(repo_name)
                
                created_at = event.get("created_at")
                if not created_at:
                    continue
                
                date_key = created_at[:10] # YYYY-MM-DD
                stats["active_dates"].add(date_key)
                    
                if etype == "PushEvent":
                    payload = event.get("payload", {})
                    # For PushEvent, distinct_size represents commits new to the repo
                    # but it's still safer to check the actual commits list if available
                    # to ensure we don't count merged commits from others.
                    actual_commits = payload.get("distinct_size", 0)
                    if actual_commits == 0 and payload.get("size", 0) > 0:
                        # Fallback to size if distinct_size is missing (unusual)
                        actual_commits = payload.get("size", 0)
                    
                    # If we have the commits list, we can check if they are actually the user's
                    # but Event API only shows up to 20 commits.
                    
                    stats["commits"] += actual_commits
                    daily_stats[date_key]["commits"] += actual_commits
                elif etype == "PullRequestEvent":
                    # Only count as a contribution if it's opened or merged
                    action = event.get("payload", {}).get("action")
                    if action in ["opened", "closed", "reopened", "synchronize"]:
                        stats["pull_requests"] += 1
                        daily_stats[date_key]["prs"] += 1
                elif etype == "IssuesEvent":
                    stats["issues"] += 1
                    daily_stats[date_key]["issues"] += 1
                elif etype == "PullRequestReviewEvent":
                    stats["reviews"] += 1
                    daily_stats[date_key]["reviews"] += 1
            
            return {
                "username": user_info.get("login"),
                "name": user_info.get("name") or user_info.get("login"),
                "avatar_url": user_info.get("avatar_url"),
                "profile_url": user_info.get("html_url"),
                "daily_stats": dict(daily_stats),
                "stats": {
                    "commits": stats["commits"],
                    "pull_requests": stats["pull_requests"],
                    "issues": stats["issues"],
                    "reviews": stats["reviews"],
                    "repo_count": len(stats["repos_contributed_to"]),
                    "total_events": stats["total_events"],
                    "active_days": len(stats["active_dates"])
                }
            }

    async def get_exact_commit_count(self, username: str, start_date: str, end_date: str) -> int:
        """
        Uses GitHub Search API to get the EXACT number of commits for a user in a period.
        Matching the GitHub contribution graph logic (author-date).
        """
        if not self.token:
            return 0
            
        async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
            query = f"author:{username} author-date:{start_date}..{end_date}"
            try:
                resp = await client.get(
                    f"{self.base_url}/search/commits",
                    params={"q": query}
                )
                if resp.status_code == 200:
                    return resp.json().get("total_count", 0)
                elif resp.status_code == 422: # Often means range is invalid or user not found
                    return 0
                return 0
            except Exception:
                return 0

    async def get_daily_commit_counts(self, username: str, days: int = 7) -> Dict[str, int]:
        """
        Fetches exact commit counts for each day in a range.
        Slower but 'exactly real' as requested.
        """
        results = {}
        now = datetime.utcnow()
        for i in range(days):
            date_str = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            count = await self.get_exact_commit_count(username, date_str, date_str)
            results[date_str] = count
        return results

    async def get_org_repos(self, org: str) -> List[Dict]:
        async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/orgs/{org}/repos")
            if resp.status_code == 200:
                return resp.json()
            return []

    async def get_repo_workflows(self, owner: str, repo: str) -> List[Dict]:
        async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/repos/{owner}/{repo}/actions/workflows")
            if resp.status_code == 200:
                return resp.json().get("workflows", [])
            return []

    async def get_workflow_runs(self, owner: str, repo: str) -> List[Dict]:
        async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/repos/{owner}/{repo}/actions/runs")
            if resp.status_code == 200:
                return resp.json().get("workflow_runs", [])
            return []

    async def setup_webhook(self, owner: str, repo: str, callback_url: str):
        async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
            data = {
                "name": "web",
                "active": True,
                "events": ["push", "workflow_run"],
                "config": {
                    "url": callback_url,
                    "content_type": "json",
                    "insecure_ssl": "0"
                }
            }
            resp = await client.post(f"{self.base_url}/repos/{owner}/{repo}/hooks", json=data)
            return resp.status_code == 201

tracker_service = GitHubTracker()
