import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

async def check():
    token = os.getenv("GITHUB_TOKEN")
    print(f"Token length: {len(token) if token else 'None'}")
    
    headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Test'
    }
    if token:
        headers['Authorization'] = f'token {token}'
        
    async with httpx.AsyncClient(headers=headers) as client:
        # Check rate limit
        resp = await client.get("https://api.github.com/rate_limit")
        print(f"Rate Limit Info: {resp.json().get('rate', {})}")
        
        # Check user events
        username = "Dharunika-07-N"
        resp = await client.get(f"https://api.github.com/users/{username}/events")
        if resp.status_code == 200:
            events = resp.json()
            print(f"Found {len(events)} events for {username}")
            for e in events:
                print(f"- {e['type']} at {e['created_at']} in {e['repo']['name']}")
        else:
            print(f"Error fetching events: {resp.status_code} {resp.text}")

if __name__ == "__main__":
    asyncio.run(check())
