#!/bin/bash
set -e

cd "$(dirname "$0")"

# Check dependencies
echo "=== Checking dependencies ==="
pip install -q openai moviepy pillow mutagen

if [ -z "$OPENAI_API_KEY" ]; then
    echo "ERROR: OPENAI_API_KEY environment variable is not set."
    echo "Please set it using: export OPENAI_API_KEY=your_key_here"
    exit 1
fi

echo "=== Generating TTS audio ==="
python generate_audio.py

echo "=== Assembling video ==="
python assemble_video.py

echo "=== Done! Output: output/tutorial.mp4 ==="
