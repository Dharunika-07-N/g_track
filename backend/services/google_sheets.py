import gspread
from google.oauth2.service_account import Credentials
import os
from typing import List, Dict, Optional
import re

class GoogleSheetsService:
    def __init__(self):
        # Base directory of the project (one level up from services/ folder)
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.credentials_path = os.getenv(
            "GOOGLE_SHEETS_CREDENTIALS_PATH", 
            os.path.join(self.base_dir, "service_account.json")
        )
        self.scopes = [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/drive.readonly'
        ]
        self.client = None
        self._authenticate()

    def _authenticate(self):
        if not os.path.exists(self.credentials_path):
            print(f"Warning: Google service account credentials not found at {self.credentials_path}")
            return

        try:
            creds = Credentials.from_service_account_file(self.credentials_path, scopes=self.scopes)
            self.client = gspread.authorize(creds)
        except Exception as e:
            print(f"Error authenticating with Google Sheets: {e}")

    def extract_sheet_id(self, url: str) -> Optional[str]:
        # Typical URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
        match = re.search(r"/d/([a-zA-Z0-9-_]+)", url)
        return match.group(1) if match else None

    def get_sheet_responses(self, sheet_url: str) -> List[Dict]:
        if not self.client:
            self._authenticate()
            if not self.client:
                raise Exception("Google Sheets client not authenticated")

        sheet_id = self.extract_sheet_id(sheet_url)
        if not sheet_id:
            raise Exception("Invalid Google Sheet URL")

        try:
            spreadsheet = self.client.open_by_key(sheet_id)
            worksheet = spreadsheet.get_worksheet(0) # Assume first sheet
            records = worksheet.get_all_records()
            return records
        except Exception as e:
            print(f"Error fetching sheet data: {e}")
            raise Exception(f"Failed to fetch Google Sheet data: {str(e)}")

google_sheets_service = GoogleSheetsService()
