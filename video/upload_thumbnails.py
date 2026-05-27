#!/usr/bin/env python3
"""
Upload thumbnails to the newly created YouTube videos.
"""

import pickle
from pathlib import Path
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# ── Config ─────────────────────────────────────────────────────────────────────
VIDEO_DIR = Path(__file__).parent
TOKEN_FILE = VIDEO_DIR / "token.pickle"

UPLOADS = [
    {"video_id": "D0YpabyIIVQ", "name": "Antigravity", "path": VIDEO_DIR / "antigravity" / "output" / "thumbnail.png"},
    {"video_id": "ScFz08tMOnA", "name": "Codex",       "path": VIDEO_DIR / "codex"       / "output" / "thumbnail.png"},
    {"video_id": "Vr7xcrD5Jd8", "name": "Cursor",      "path": VIDEO_DIR / "cursor"      / "output" / "thumbnail.png"},
]

def main():
    if not TOKEN_FILE.exists():
        print("❌ Token file not found. Please authenticate by running upload_youtube.py first.")
        return

    with open(TOKEN_FILE, "rb") as f:
        creds = pickle.load(f)

    youtube = build("youtube", "v3", credentials=creds)

    for item in UPLOADS:
        video_id = item["video_id"]
        thumb_path = item["path"]
        name = item["name"]

        if not thumb_path.exists():
            print(f"⚠️ Thumbnail not found for {name}: {thumb_path}")
            continue

        print(f"📤 Uploading thumbnail for {name} (Video ID: {video_id})...")
        try:
            request = youtube.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(str(thumb_path), mimetype="image/png")
            )
            response = request.execute()
            print(f"   ✅ Done! Thumbnail updated successfully.")
        except Exception as e:
            print(f"   ❌ Error uploading thumbnail: {e}")

    print("\n🎉 All thumbnails uploaded!")

if __name__ == "__main__":
    main()
