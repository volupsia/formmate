import json
import os
from openai import OpenAI
from mutagen.mp3 import MP3

client = OpenAI() # Assumes OPENAI_API_KEY is set in environment

def generate_audio():
    # Load narration.json
    with open('narration.json', 'r') as f:
        narrations = json.load(f)

    # Ensure audio directory exists
    os.makedirs('audio', exist_ok=True)

    timing = {}

    for segment in narrations:
        segment_id = segment['id']
        text = segment['text']
        audio_path = f"audio/{segment_id}.mp3"
        
        print(f"Generating audio for {segment_id}...")
        
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice="nova",
            input=text
        )
        response.stream_to_file(audio_path)
        
        # Get actual duration
        audio = MP3(audio_path)
        duration = audio.info.length
        timing[segment_id] = duration
        print(f"Saved {audio_path} (Duration: {duration:.2f}s)")

    # Save timing.json
    with open('timing.json', 'w') as f:
        json.dump(timing, f, indent=2)
    print("Saved timing.json")

if __name__ == "__main__":
    generate_audio()
