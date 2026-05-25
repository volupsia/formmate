import json
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips

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
    
    # Draw subtitle background bar
    draw = ImageDraw.Draw(img, 'RGBA')
    bar_height = 80
    bar_top = resolution[1] - bar_height
    draw.rectangle([(0, bar_top), (resolution[0], resolution[1])], fill=(0, 0, 0, 180))
    
    # Try to load a reasonable font, fallback to default
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 40)
    except:
        font = ImageFont.load_default()
        
    # Draw text
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_x = (resolution[0] - text_width) / 2
    text_y = bar_top + (bar_height - (text_bbox[3] - text_bbox[1])) / 2
    draw.text((text_x, text_y), text, font=font, fill=(255, 255, 255, 255))
    
    # Convert PIL Image to numpy array for moviepy
    img_array = np.array(img)
    
    # Create moviepy clip
    clip = ImageClip(img_array).set_duration(duration)
    return clip

def assemble_video():
    with open('narration.json', 'r') as f:
        narrations = json.load(f)
        
    with open('timing.json', 'r') as f:
        timing = json.load(f)
        
    clips = []
    
    for segment in narrations:
        segment_id = segment['id']
        screenshot_path = segment['screenshot']
        audio_path = f"audio/{segment_id}.mp3"
        duration = timing.get(segment_id, segment['duration'])
        title = segment.get('title', '')
        
        print(f"Processing segment {segment_id}...")
        
        # Make sure screenshot exists
        if not os.path.exists(screenshot_path):
            print(f"WARNING: Screenshot {screenshot_path} not found. Skipping segment.")
            continue
            
        # Create image clip with subtitle
        img_clip = add_ken_burns_and_subtitle(screenshot_path, title, duration)
        
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
    
    os.makedirs('output', exist_ok=True)
    output_path = "output/tutorial.mp4"
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
    assemble_video()
