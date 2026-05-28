import json
import os
import sys
import subprocess
from mutagen.mp3 import MP3

def generate_audio(video_dir):
    # Load narration.json
    with open(os.path.join(video_dir, 'narration.json'), 'r') as f:
        narrations = json.load(f)

    # Ensure audio directory exists
    audio_dir = os.path.join(video_dir, 'audio')
    os.makedirs(audio_dir, exist_ok=True)

    timing = {}

    for segment in narrations:
        segment_id = segment['id']
        text = segment['text']
        audio_path = os.path.join(audio_dir, f"{segment_id}.mp3")
        
        print(f"Generating audio for {segment_id}...")
        
        # Use edge-tts for premium AI voice
        subprocess.run(['edge-tts', '--voice', 'en-US-AriaNeural', '--text', text, '--write-media', audio_path], check=True)
        
        # Get actual duration
        audio = MP3(audio_path)
        duration = audio.info.length
        timing[segment_id] = duration
        print(f"Saved {audio_path} (Duration: {duration:.2f}s)")

    # Save timing.json
    timing_path = os.path.join(video_dir, 'timing.json')
    with open(timing_path, 'w') as f:
        json.dump(timing, f, indent=2)
    print(f"Saved {timing_path}")

if __name__ == "__main__":
    video_dir = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    generate_audio(video_dir)
