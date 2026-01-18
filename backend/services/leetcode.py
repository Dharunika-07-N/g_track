import httpx
from typing import Optional, Dict

class LeetCodeService:
    def __init__(self):
        self.base_url = "https://leetcode-stats-api.herokuapp.com" 

    async def get_user_stats(self, username: str) -> Optional[Dict]:
        if not username:
            return None
            
        try:
            async with httpx.AsyncClient() as client:
                # Using a popular open-source wrapper API or official graphql
                # For this demo, let's use the public wrapper API which is stable
                response = await client.get(f"{self.base_url}/{username}")
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "error":
                        return None
                    return {
                        "total_solved": data.get("totalSolved"),
                        "easy_solved": data.get("easySolved"),
                        "medium_solved": data.get("mediumSolved"),
                        "hard_solved": data.get("hardSolved"),
                        "ranking": data.get("ranking"),
                        "points": data.get("contributionPoints"),
                        "reputation": data.get("reputation")
                    }
        except Exception as e:
            print(f"Error fetching LeetCode stats for {username}: {e}")
            
        return None

leetcode_service = LeetCodeService()
