import json
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
import textwrap

def add_ken_burns_and_subtitle(image_path, text, duration, resolution=(1920, 1080)):
    # Create the base image clip
    img = Image.open(image_path).convert("RGB")
    
    # Calculate crop/resize to fill 1920x1080
    target_ratio = resolution[0] / resolution[1]
    img_ratio = img.width / img.height
    
    if img_ratio > target_ratio:
        # Image is wider, crop width
        new_width = int(img.height * target_ratio)
        left = (img.width - new_width) / 2
        img = img.crop((left, 0, left + new_width, img.height))
    else:
        # Image is taller, crop height
        new_height = int(img.width / target_ratio)
        top = (img.height - new_height) / 2
        img = img.crop((0, top, img.width, top + new_height))
        
    img = img.resize(resolution, Image.Resampling.LANCZOS)
    
    # Try to load a reasonable font, fallback to default
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
    except:
        font = ImageFont.load_default()

    # Wrap text
    lines = textwrap.wrap(text, width=80)
    
    # Calculate text height to draw the background bar
    line_spacing = 10
    total_text_height = sum(font.getbbox(line)[3] - font.getbbox(line)[1] for line in lines) + (len(lines) - 1) * line_spacing
    
    bar_height = total_text_height + 40 # 20px padding top/bottom
    bar_top = resolution[1] - bar_height - 30 # 30px margin from bottom
    
    # Draw subtitle background bar
    draw = ImageDraw.Draw(img, 'RGBA')
    draw.rectangle([(0, bar_top), (resolution[0], bar_top + bar_height)], fill=(0, 0, 0, 200))
    
    # Draw text lines
    current_y = bar_top + 20
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        text_x = (resolution[0] - text_width) / 2
        draw.text((text_x, current_y), line, font=font, fill=(255, 255, 255, 255))
        current_y += (bbox[3] - bbox[1]) + line_spacing
    
    # Convert PIL Image to numpy array for moviepy
    img_array = np.array(img)
    
    # Create moviepy clip
    clip = ImageClip(img_array).set_duration(duration)
    return clip

def assemble_video(video_dir):
    with open(os.path.join(video_dir, 'narration.json'), 'r') as f:
        narrations = json.load(f)
        
    with open(os.path.join(video_dir, 'timing.json'), 'r') as f:
        timing = json.load(f)
        
    clips = []
    
    for segment in narrations:
        segment_id = segment['id']
        screenshot_path = os.path.join(video_dir, segment['screenshot'])
        audio_path = os.path.join(video_dir, 'audio', f"{segment_id}.mp3")
        duration = timing.get(segment_id, segment['duration'])
        text = segment.get('text', '')
        
        print(f"Processing segment {segment_id}...")
        
        # Make sure screenshot exists
        if not os.path.exists(screenshot_path):
            print(f"WARNING: Screenshot {screenshot_path} not found. Skipping segment.")
            continue
            
        # Create image clip with subtitle
        img_clip = add_ken_burns_and_subtitle(screenshot_path, text, duration)
        
        # Load audio clip
        audio_clip = AudioFileClip(audio_path)
        
        # Set audio to image clip
        video_clip = img_clip.set_audio(audio_clip)
        clips.append(video_clip)
        
    if not clips:
        print("No valid clips found to assemble.")
        return
        
    print("Concatenating clips...")
    final_video = concatenate_videoclips(clips, method="compose")
    
    # Add fade in/out
    final_video = final_video.fadein(0.5).fadeout(0.5)
    
    output_dir = os.path.join(video_dir, 'output')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'tutorial.mp4')
    print(f"Exporting to {output_path}...")
    final_video.write_videofile(
        output_path, 
        fps=24, 
        codec="libx264", 
        audio_codec="aac",
        threads=4
    )
    print("Video export complete!")

if __name__ == "__main__":
    video_dir = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    assemble_video(video_dir)
