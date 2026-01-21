import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import os
from dotenv import load_dotenv
import asyncio
import time
import json

load_dotenv()

class GitHubTracker:
    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("GITHUB_TOKEN")
        self.base_url = "https://api.github.com"
        self.graphql_url = "https://api.github.com/graphql"
        
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GithubActivityTracker/1.0"
        }
        
    async def get_real_profile_contributions(
        self, 
        username: str, 
        start_date: str, 
        end_date: str
    ) -> Dict:
        """
        FETCHES REAL DATA USING GRAPHQL API.
        This matches the 'Contributions' count shown on GitHub profiles.
        Includes commits, PRs, Issues, and Reviews across all repos.
        """
        if not self.token:
            return {"total_commits": 0, "pull_requests": 0, "active_days": 0, "total_contributions": 0}

        # Convert date strings to ISO8601 for GraphQL
        try:
            from_dt = datetime.strptime(start_date, "%Y-%m-%d").isoformat() + "Z"
            to_dt = datetime.strptime(end_date, "%Y-%m-%d").isoformat() + "Z"
        except ValueError:
            return {"total_commits": 0, "pull_requests": 0, "active_days": 0, "total_contributions": 0}

        query = """
        query($username: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $username) {
            contributionsCollection(from: $from, to: $to) {
              totalCommitContributions
              totalPullRequestContributions
              totalIssueContributions
              totalPullRequestReviewContributions
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    contributionCount
                    date
                  }
                }
              }
            }
            repositories(ownerAffiliations: OWNER, first: 1) {
              totalCount
            }
            avatarUrl
            url
            name
          }
        }
        """
        
        variables = {
            "username": username,
            "from": from_dt,
            "to": to_dt
        }

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=20.0) as client:
                resp = await client.post(
                    self.graphql_url,
                    json={"query": query, "variables": variables}
                )
                
                if resp.status_code != 200:
                    print(f"❌ GraphQL Error {resp.status_code} for {username}")
                    return None

                data = resp.json()
                if "errors" in data:
                    print(f"❌ GraphQL Query Errors for {username}: {data['errors'][0]['message']}")
                    return None

                user_data = data["data"]["user"]
                if not user_data:
                    return None

                stats = user_data["contributionsCollection"]
                calendar = stats["contributionCalendar"]
                
                # Calculate active days (days with at least 1 contribution)
                active_days = 0
                for week in calendar["weeks"]:
                    for day in week["contributionDays"]:
                        if day["contributionCount"] > 0:
                            active_days += 1

                return {
                    "total_commits": stats["totalCommitContributions"],
                    "pull_requests": stats["totalPullRequestContributions"],
                    "issues": stats["totalIssueContributions"],
                    "reviews": stats["totalPullRequestReviewContributions"],
                    "total_contributions": calendar["totalContributions"],
                    "active_days": active_days,
                    "repo_count": user_data["repositories"]["totalCount"],
                    "avatar_url": user_data["avatarUrl"],
                    "profile_url": user_data["url"],
                    "name": user_data["name"] or username,
                    "daily_breakdown": calendar["weeks"] # Expose raw calendar
                }
                
        except Exception as e:
            print(f"❌ Error in GraphQL fetch for {username}: {e}")
            return None

    async def get_complete_student_stats(
        self,
        username: str,
        start_date: str,
        end_date: str,
        period: str = "custom"
    ) -> Dict:
        """
        Main method using the GraphQL 'Real Data' provider.
        """
        print(f"📊 Fetching REAL stats for {username} via GraphQL ({start_date} to {end_date})...")
        
        real_stats = await self.get_real_profile_contributions(username, start_date, end_date)
        
        if real_stats:
            # Calculate activity score using the improved real data
            # Formula: (Commits * 2) + (PRs * 3) + (Active Days * 1)
            commits = real_stats["total_commits"]
            prs = real_stats["pull_requests"]
            active_days = real_stats["active_days"]
            
            activity_score = (commits * 2) + (prs * 3) + (active_days * 1)
            
            print(f"  ✅ {username}: Commits={commits}, PRs={prs}, Days={active_days}, Score={activity_score}")
            
            return {
                "username": username,
                "total_commits": commits,
                "pull_requests": prs,
                "repo_count": real_stats["repo_count"],
                "active_days": active_days,
                "activity_score": activity_score,
                "total_contributions": real_stats["total_contributions"],
                "period": period,
                "start_date": start_date,
                "end_date": end_date,
                "avatar_url": real_stats["avatar_url"],
                "profile_url": real_stats["profile_url"],
                "name": real_stats["name"],
                "daily_breakdown": real_stats.get("daily_breakdown", [])
            }
        else:
            # Fallback to empty if even GraphQL fails
            return self._empty_stats(username, start_date, end_date, period)

    def _empty_stats(self, username: str, start_date: str, end_date: str, period: str) -> Dict:
        return {
            "username": username,
            "total_commits": 0,
            "pull_requests": 0,
            "repo_count": 0,
            "active_days": 0,
            "activity_score": 0,
            "period": period,
            "start_date": start_date,
            "end_date": end_date
        }

    async def analyze_user(self, username: str) -> Dict:
        """Fetches user profile and recent year stats"""
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
        start_date = (datetime.utcnow() - timedelta(days=365)).strftime("%Y-%m-%d")
        
        stats = await self.get_complete_student_stats(username, start_date, end_date, "year")
        
        return {
            "username": username,
            "name": stats.get("name") or username,
            "avatar_url": stats.get("avatar_url"),
            "profile_url": stats.get("profile_url"),
            "stats": stats
        }

tracker_service = GitHubTracker()