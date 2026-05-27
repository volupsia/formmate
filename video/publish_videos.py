#!/usr/bin/env python3
"""
Change privacy status of the uploaded videos to public.
Requests full youtube.force-ssl scope if the existing token is insufficient.
"""

import pickle
import os
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# ── Config ─────────────────────────────────────────────────────────────────────
VIDEO_DIR = Path(__file__).parent
CLIENT_SECRETS = VIDEO_DIR / "client_secrets.json"
TOKEN_FILE = VIDEO_DIR / "token_force_ssl.pickle"
SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]

VIDEOS = [
    {"video_id": "D0YpabyIIVQ", "name": "Antigravity"},
    {"video_id": "ScFz08tMOnA", "name": "Codex"},
    {"video_id": "Vr7xcrD5Jd8", "name": "Cursor"},
]

def get_credentials():
    creds = None
    if TOKEN_FILE.exists():
        with open(TOKEN_FILE, "rb") as f:
            creds = pickle.load(f)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRETS), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "wb") as f:
            pickle.dump(creds, f)
    return creds

def main():
    if not CLIENT_SECRETS.exists():
        print("❌ client_secrets.json not found.")
        return

    creds = get_credentials()
    youtube = build("youtube", "v3", credentials=creds)

    for item in VIDEOS:
        video_id = item["video_id"]
        name = item["name"]

        print(f"🌐 Publishing {name} video (Video ID: {video_id}) to PUBLIC...")
        try:
            # Fetch the existing video metadata first
            video_response = youtube.videos().list(
                part="status,snippet",
                id=video_id
            ).execute()

            if not video_response["items"]:
                print(f"   ❌ Video {video_id} not found.")
                continue

            video_data = video_response["items"][0]
            
            # Update privacy status to public
            video_data["status"]["privacyStatus"] = "public"

            update_body = {
                "id": video_id,
                "status": video_data["status"],
                "snippet": video_data["snippet"]
            }

            request = youtube.videos().update(
                part="status,snippet",
                body=update_body
            )
            response = request.execute()
            print(f"   ✅ Success! Video is now PUBLIC.")
        except Exception as e:
            print(f"   ❌ Error publishing: {e}")

    print("\n🎉 All videos published!")

if __name__ == "__main__":
    main()
