#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VIDEO="${1:-antigravity}"
VIDEO_DIR="$SCRIPT_DIR/$VIDEO"
COMMON_DIR="$SCRIPT_DIR/common"

if [ ! -d "$VIDEO_DIR" ]; then
    echo "ERROR: Video folder '$VIDEO_DIR' does not exist."
    echo "Usage: bash run_all.sh <video-name>   (default: antigravity)"
    exit 1
fi

echo "=== Building video: $VIDEO ==="

# Setup virtual environment (shared at the video/ root)
echo "=== Setting up virtual environment ==="
python3 -m venv "$SCRIPT_DIR/venv"
source "$SCRIPT_DIR/venv/bin/activate"

# Check dependencies
echo "=== Checking dependencies ==="
pip install -q edge-tts "moviepy<2.0.0" pillow mutagen

echo "=== Generating TTS audio ==="
python "$COMMON_DIR/generate_audio.py" "$VIDEO_DIR"

echo "=== Assembling video ==="
python "$COMMON_DIR/assemble_video.py" "$VIDEO_DIR"

echo "=== Done! Output: $VIDEO/output/tutorial.mp4 ==="
