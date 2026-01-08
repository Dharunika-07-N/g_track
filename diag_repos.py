import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

async def check_repos():
    token = os.getenv("GITHUB_TOKEN")
    headers = {'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Test'}
    if token: headers['Authorization'] = f'token {token}'
        
    async with httpx.AsyncClient(headers=headers) as client:
        username = "Dharunika-07-N"
        # Sort by updated
        resp = await client.get(f"https://api.github.com/users/{username}/repos", params={'sort': 'updated', 'per_page': 5})
        if resp.status_code == 200:
            repos = resp.json()
            print(f"Recently updated repos for {username}:")
            for r in repos:
                print(f"- {r['name']}: {r['updated_at']} (Push at: {r['pushed_at']})")
        else:
            print(f"Error: {resp.status_code}")

if __name__ == "__main__":
    asyncio.run(check_repos())
