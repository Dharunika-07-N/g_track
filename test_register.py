import requests
import json
import os

API_URL = "http://localhost:8000"

def test_register():
    data = {
        "github_username": "testuser",
        "email": "test@example.com",
        "password": "testpassword",
        "name": "Test User",
        "department": "CSE",
        "role": "hod"
    }
    
    print(f"Testing registration at {API_URL}/auth/register...")
    try:
        response = requests.post(f"{API_URL}/auth/register", json=data, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_register()
