#!/usr/bin/env python3
"""
Upload tutorial videos to YouTube using the YouTube Data API v3.
Reads title, description, and tags from each tutorial's youtube.md file.
"""

import os
import re
import pickle
import sys
from pathlib import Path

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# ── Config ─────────────────────────────────────────────────────────────────────
VIDEO_DIR = Path(__file__).parent
CLIENT_SECRETS = VIDEO_DIR / "client_secrets.json"
TOKEN_FILE = VIDEO_DIR / "token.pickle"
SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

TUTORIALS = [
    VIDEO_DIR / "antigravity" / "output",
    VIDEO_DIR / "codex"       / "output",
    VIDEO_DIR / "cursor"      / "output",
]

# ── Auth ───────────────────────────────────────────────────────────────────────
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

# ── Parse youtube.md ───────────────────────────────────────────────────────────
def parse_youtube_md(md_path: Path) -> dict:
    text = md_path.read_text(encoding="utf-8")

    def extract(header):
        pattern = rf"## {header}\n(.*?)(?=\n## |\Z)"
        m = re.search(pattern, text, re.DOTALL)
        return m.group(1).strip() if m else ""

    title       = extract("Title")
    filename    = extract("Filename")
    description = extract("Description")
    tags_raw    = extract("Tags")
    tags = [t.strip() for t in tags_raw.split(",") if t.strip()]

    return {
        "title":       title,
        "filename":    filename,
        "description": description,
        "tags":        tags,
    }

# ── Upload ─────────────────────────────────────────────────────────────────────
def upload_video(youtube, video_path: Path, meta: dict):
    print(f"\n📤 Uploading: {meta['title']}")
    print(f"   File: {video_path.name}  ({video_path.stat().st_size / 1_048_576:.1f} MB)")

    body = {
        "snippet": {
            "title":       meta["title"],
            "description": meta["description"],
            "tags":        meta["tags"],
            "categoryId":  "28",   # Science & Technology
            "defaultLanguage": "en",
        },
        "status": {
            "privacyStatus": "unlisted",   # safe default — publish manually
        },
    }

    media = MediaFileUpload(
        str(video_path),
        mimetype="video/mp4",
        resumable=True,
        chunksize=1024 * 1024,  # 1 MB chunks
    )

    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            pct = int(status.progress() * 100)
            print(f"   ⬆  {pct}% uploaded...", end="\r", flush=True)

    video_id = response["id"]
    print(f"\n   ✅ Done! https://www.youtube.com/watch?v={video_id}")
    return video_id

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    creds   = get_credentials()
    youtube = build("youtube", "v3", credentials=creds)

    for output_dir in TUTORIALS:
        md_path = output_dir / "youtube.md"
        if not md_path.exists():
            print(f"⚠️  No youtube.md found in {output_dir}, skipping.")
            continue

        meta = parse_youtube_md(md_path)

        # Find the mp4 in the output dir
        mp4s = list(output_dir.glob("*.mp4"))
        if not mp4s:
            print(f"⚠️  No .mp4 found in {output_dir}, skipping.")
            continue

        video_path = mp4s[0]
        upload_video(youtube, video_path, meta)

    print("\n🎉 All uploads complete!")

if __name__ == "__main__":
    main()
