# backend/test_token.py
import os
from dotenv import load_dotenv
import httpx
import asyncio

load_dotenv()

async def test_token():
    token = os.getenv("GITHUB_TOKEN")
    
    if not token:
        print("ERROR: GITHUB_TOKEN not found!")
        return
    
    print(f"Token found: {token[:10]}...{token[-4:]}")
    
    # Test with a simple API call
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GithubActivityTracker/1.0"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("https://api.github.com/user", headers=headers)
            
            if resp.status_code == 200:
                data = resp.json()
                print(f"Token is VALID! Authenticated as: {data['login']}")
            else:
                print(f"Token is INVALID! Status: {resp.status_code}")
                print(f"Response: {resp.text}")
        except Exception as e:
            print(f"Error during request: {e}")

if __name__ == "__main__":
    asyncio.run(test_token())
