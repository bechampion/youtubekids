#!/bin/bash

# Generate Thumbnails Script - Fixed Version
# Creates WebP thumbnails for MP4 and WebM videos that don't have them

echo "=== Video Thumbnail Generator (Fixed) ==="
echo ""

# Check dependencies
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg not found. Install with: sudo apt install ffmpeg"
    exit 1
fi

if ! command -v ffprobe &> /dev/null; then
    echo "❌ FFprobe not found. Install with: sudo apt install ffmpeg"
    exit 1
fi

echo "✅ FFmpeg and FFprobe found"
echo ""

# Count videos and existing thumbnails
total_videos=0
existing_thumbnails=0
generated_thumbnails=0
failed_thumbnails=0
skipped_invalid=0

# Create mapping file for simplified thumbnails
MAPPING_FILE="thumbnail_mapping.json"
echo "{" > "$MAPPING_FILE"
mapping_entries=""

# Function to generate simple filename for thumbnail
generate_simple_filename() {
    local filename="$1"
    local counter="$2"
    
    # If filename has only basic characters, use it as-is
    if [[ "$filename" =~ ^[a-zA-Z0-9._-]+$ ]]; then
        echo "$filename"
    else
        # Use simple sequential naming for complex filenames
        echo "video_${counter}"
    fi
}

# Function to generate thumbnail for a video
generate_thumbnail() {
    local video_file="$1"
    local basename=$(basename "$video_file")
    local video_dir=$(dirname "$video_file")
    
    # Skip files that are not actual video files
    if [[ "$basename" =~ \.f[0-9]+(\.|$) ]]; then
        echo "⏭️  Skip: $basename (incomplete download)"
        ((skipped_invalid++))
        return 0
    fi
    
    # Get clean basename without extension
    local clean_basename="${basename%.*}"
    
    # Skip files with _mp4 or _webm in the name that end with different extensions
    if [[ "$basename" =~ _mp4\.webm$ ]] || [[ "$basename" =~ _webm\.mp4$ ]]; then
        echo "⏭️  Skip: $basename (misnamed file)"
        ((skipped_invalid++))
        return 0
    fi
    
    # Create simple thumbnail filename
    local simple_basename=$(generate_simple_filename "$clean_basename" "$total_videos")
    local thumbnail_file="$video_dir/$simple_basename.webp"
    
    # Skip if thumbnail already exists
    if [[ -f "$thumbnail_file" ]]; then
        echo "⏭️  Skip: $simple_basename.webp (already exists)"
        ((existing_thumbnails++))
        return 0
    fi
    
    echo "🔄 Generating: $simple_basename.webp"
    
    # Check if video file exists and is readable
    if [[ ! -r "$video_file" ]]; then
        echo "❌ Cannot read video file: $video_file"
        ((failed_thumbnails++))
        return 1
    fi
    
    # Get video duration with better error handling
    local duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$video_file" 2>/dev/null)
    
    # Validate duration
    if [[ -z "$duration" ]] || [[ "$duration" == "N/A" ]] || [[ "$duration" == "0.000000" ]] || (( $(echo "$duration < 1" | bc -l) )); then
        echo "❌ Invalid duration ($duration) for: $basename"
        ((failed_thumbnails++))
        return 1
    fi
    
    # Calculate random timestamp (10% to 90% of video)
    local min_time=$(echo "$duration * 0.1" | bc -l)
    local max_time=$(echo "$duration * 0.9" | bc -l)
    #local random_time=$(echo "$min_time + ($RANDOM / 32767) * ($max_time - $min_time)" | bc -l)
    local random_time=$(( RANDOM % 1 + 30 ))
    echo "   Random time: $random_time seconds (between $min_time and $max_time)"
    
    # Generate thumbnail with better error handling
    echo "   Duration: ${duration}s, Random time: ${random_time}s"
    
    # Use temporary file to avoid issues with special characters
    local temp_thumbnail="/tmp/thumb_$$.webp"
    ##put the name of the directory in a variable
    local video_dir=$(dirname "$video_file")
    
    if ffmpeg -i "$video_file" \
        -ss "$random_time" \
        -vframes 1 \
        -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,drawtext=text='${video_dir}!':fontsize=80:fontcolor=yellow:x=(w-text_w)/2:y=h-text_h-50:box=1:boxcolor=blue@0.7,drawtext=text='${video_dir}!':fontsize=80:fontcolor=red:x=(w-text_w)/2+3:y=h-text_h-47:box=0,drawtext=text='${video_dir}!':fontsize=80:fontcolor=cyan:x=(w-text_w)/2-3:y=h-text_h-53:box=0" \
        -quality 95 \
        -q:v 1 \
        -compression_level 6 \
        -y \
        "$temp_thumbnail" \
        -hide_banner -loglevel error 2>/dev/null; then
        
        # Move temp file to final location
        if mv "$temp_thumbnail" "$thumbnail_file" 2>/dev/null; then
            local video_size=$(du -h "$video_file" | cut -f1)
            local thumb_size=$(du -h "$thumbnail_file" | cut -f1)
            echo "✅ Generated: $simple_basename.webp ($thumb_size)"
            ((generated_thumbnails++))
            
            # Add mapping entry if simplified name was used
            if [[ "$simple_basename" != "$clean_basename" ]]; then
                if [[ -n "$mapping_entries" ]]; then
                    mapping_entries+=","
                fi
                mapping_entries+="\n  \"$clean_basename\": \"$simple_basename\""
            fi
            
            return 0
        else
            echo "❌ Failed to move thumbnail: $simple_basename.webp"
            rm -f "$temp_thumbnail" 2>/dev/null
            ((failed_thumbnails++))
            return 1
        fi
    else
        echo "❌ FFmpeg failed for: $basename"
        rm -f "$temp_thumbnail" 2>/dev/null
        ((failed_thumbnails++))
        return 1
    fi
}

# Find all actual video files (excluding misnamed ones)
echo "📁 Scanning for video files..."
echo ""

while IFS= read -r -d '' video_file; do
    # Only process files that actually end with .mp4 or .webm
    if [[ "$video_file" =~ \.(mp4|webm)$ ]]; then
        ((total_videos++))
        generate_thumbnail "$video_file"
    fi
done < <(find . -maxdepth 2 -type f \( -name "*.mp4" -o -name "*.webm" \) ! -name "*_mp4.webm" ! -name "*_webm.mp4" -print0)

# Summary
echo ""
echo "=== Generation Complete ==="
echo "📊 Total valid videos: $total_videos"
echo "✅ Existing thumbnails: $existing_thumbnails"
echo "🎨 Generated thumbnails: $generated_thumbnails"
echo "❌ Failed to generate: $failed_thumbnails"
echo "⏭️  Skipped invalid files: $skipped_invalid"
echo ""

if [[ $generated_thumbnails -gt 0 ]]; then
    echo "🎉 Generated $generated_thumbnails new thumbnails!"
elif [[ $existing_thumbnails -gt 0 ]]; then
    echo "😊 All valid videos already have thumbnails!"
else
    echo "🤔 No valid videos found to process."
fi

# Finish the mapping file
if [[ -n "$mapping_entries" ]]; then
    echo -e "$mapping_entries" >> "$MAPPING_FILE"
fi
echo "}" >> "$MAPPING_FILE"

if [[ $failed_thumbnails -gt 0 ]]; then
    echo ""
    echo "💡 Tip: Failed videos might have issues or corrupted files."
fi

if [[ -s "$MAPPING_FILE" ]] && [[ $(wc -l < "$MAPPING_FILE") -gt 2 ]]; then
    echo ""
    echo "📋 Created mapping file: $MAPPING_FILE"
    echo "   This helps the backend match simplified thumbnails to videos."
fi
