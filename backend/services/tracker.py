import httpx
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Optional
import asyncio

class GitHubTracker:
    def __init__(self, token: Optional[str] = None):
        self.token = token
        self.headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GithubActivityTracker/1.0'
        }
        if token:
            self.headers['Authorization'] = f'token {token}'
        self.base_url = 'https://api.github.com'
    
    async def get_user_info(self, client: httpx.AsyncClient, username: str) -> Dict:
        try:
            resp = await client.get(f"{self.base_url}/users/{username}")
            if resp.status_code == 200:
                return resp.json()
            return {"error": f"Status {resp.status_code}"}
        except Exception as e:
            return {"error": str(e)}

    async def get_user_events(self, client: httpx.AsyncClient, username: str, days: int = 30) -> List[Dict]:
        events = []
        page = 1
        # Github events API checks public events. `per_page` max is 100.
        # We fetch a few pages to cover the days.
        # Note: GitHub API limits retrieving events to the last 90 days or 300 events.
        
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        while True:
            try:
                resp = await client.get(
                    f"{self.base_url}/users/{username}/events/public",
                    params={'page': page, 'per_page': 100}
                )
                if resp.status_code != 200:
                    break
                    
                data = resp.json()
                if not data:
                    break
                
                # Check dates
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
                if page > 5: # Safety break to avoid excess API calls
                    break
            except Exception:
                break
                
        return events

    async def analyze_user(self, username: str) -> Dict:
        async with httpx.AsyncClient(headers=self.headers, timeout=10.0) as client:
            user_info = await self.get_user_info(client, username)
            if "error" in user_info:
                return None
            
            events = await self.get_user_events(client, username)
            
            stats = {
                "commits": 0,
                "pull_requests": 0,
                "issues": 0,
                "reviews": 0,
                "repos_contributed_to": set(),
                "total_events": len(events)
            }
            
            for event in events:
                etype = event.get("type")
                repo_name = event.get("repo", {}).get("name")
                if repo_name:
                    stats["repos_contributed_to"].add(repo_name)
                    
                if etype == "PushEvent":
                    stats["commits"] += event.get("payload", {}).get("size", 0)
                elif etype == "PullRequestEvent":
                    # Count opened or whatever, but simplistic count is fine for now
                    stats["pull_requests"] += 1
                elif etype == "IssuesEvent":
                    stats["issues"] += 1
                elif etype == "PullRequestReviewEvent":
                    stats["reviews"] += 1
            
            return {
                "username": user_info.get("login"),
                "name": user_info.get("name") or user_info.get("login"),
                "avatar_url": user_info.get("avatar_url"),
                "profile_url": user_info.get("html_url"),
                "stats": {
                    "commits": stats["commits"],
                    "pull_requests": stats["pull_requests"],
                    "issues": stats["issues"],
                    "reviews": stats["reviews"],
                    "repo_count": len(stats["repos_contributed_to"]),
                    "total_events": stats["total_events"]
                }
            }

tracker_service = GitHubTracker()
