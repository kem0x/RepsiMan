#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
captures="$root/trailer/captures"
cards="$root/trailer/cards"
output="$root/trailer/output"
work="$output/work"
segments="$work/segments"

mkdir -p "$segments"

for command in ffmpeg ffprobe sips; do
    command -v "$command" >/dev/null 2>&1 || {
        echo "Missing required command: $command" >&2
        exit 1
    }
done

for file in \
    "$captures/stage1-a.webm" \
    "$captures/stage1-gameplay.webm" \
    "$captures/stage1-real.webm" \
    "$captures/stage1-real-b.webm" \
    "$captures/landing.png" \
    "$captures/settings.png" \
    "$captures/pause-menu.png" \
    "$captures/controls.png" \
    "$captures/mobile-landscape.png"; do
    [ -f "$file" ] || { echo "Missing trailer source: $file" >&2; exit 1; }
done

sips -s format png "$cards/hook.svg" --out "$work/hook.png" >/dev/null
sips -s format png "$cards/end.svg" --out "$work/end.png" >/dev/null
sips -s format png "$cards/features.svg" --out "$work/features.png" >/dev/null
sips -s format png "$cards/overlay-original.svg" --out "$work/overlay-original.png" >/dev/null
sips -s format png "$cards/overlay-enhanced.svg" --out "$work/overlay-enhanced.png" >/dev/null
sips -s format png "$cards/thumbnail.svg" --out "$output/Pepsiman-Recompiled-v1-thumbnail.png" >/dev/null

encode_video() {
    input=$1
    start=$2
    duration=$3
    filter=$4
    destination=$5
    ffmpeg -hide_banner -loglevel error -y -fflags +genpts -i "$input" -ss "$start" -t "$duration" \
        -vf "$filter,fps=60,format=yuv420p" -an -c:v libx264 -preset veryfast -crf 18 \
        -r 60 -video_track_timescale 60000 "$destination"
}

encode_still() {
    input=$1
    duration=$2
    filter=$3
    destination=$4
    ffmpeg -hide_banner -loglevel error -y -loop 1 -framerate 60 -i "$input" -t "$duration" \
        -vf "$filter,fps=60,format=yuv420p" -an -c:v libx264 -preset veryfast -crf 18 \
        -r 60 -video_track_timescale 60000 "$destination"
}

wide_filter='crop=ih*16/9:ih:(iw-ih*16/9)/2:0,scale=1920:1080:flags=lanczos,setsar=1'
original_filter='crop=ih*4/3:ih:(iw-ih*4/3)/2:0,scale=1440:1080:flags=lanczos,pad=1920:1080:240:0:color=0x07090d,setsar=1'
still_filter='scale=1920:1080:flags=lanczos,setsar=1'
mobile_filter='scale=1688:780:flags=lanczos,pad=1920:1080:116:150:color=0x07090d,drawbox=x=112:y=146:w=1696:h=788:color=0x334155:t=4,setsar=1'

encode_video "$captures/stage1-real.webm" 0 4 "$wide_filter" "$segments/01-gameplay.mp4"
encode_still "$work/hook.png" 3 "$still_filter" "$segments/02-hook.mp4"
encode_still "$captures/landing.png" 4 "$still_filter" "$segments/03-landing.mp4"
encode_video "$captures/stage1-gameplay.webm" 0 4 "$wide_filter" "$segments/04-menu.mp4"

encode_video "$captures/stage1-real-b.webm" 0 4 "$original_filter" "$work/original-base.mp4"
ffmpeg -hide_banner -loglevel error -y -i "$work/original-base.mp4" -loop 1 -i "$work/overlay-original.png" -t 4 \
    -filter_complex '[0:v][1:v]overlay=0:0:shortest=1,format=yuv420p' -an -c:v libx264 -preset veryfast -crf 18 \
    -r 60 -video_track_timescale 60000 "$segments/05-original.mp4"

encode_video "$captures/stage1-real-b.webm" 0 4 "$wide_filter" "$work/enhanced-base.mp4"
ffmpeg -hide_banner -loglevel error -y -i "$work/enhanced-base.mp4" -loop 1 -i "$work/overlay-enhanced.png" -t 4 \
    -filter_complex '[0:v][1:v]overlay=0:0:shortest=1,format=yuv420p' -an -c:v libx264 -preset veryfast -crf 18 \
    -r 60 -video_track_timescale 60000 "$segments/06-enhanced.mp4"

encode_still "$captures/settings.png" 4 "$still_filter" "$segments/07-settings.mp4"
encode_still "$captures/pause-menu.png" 4 "$still_filter" "$segments/08-pause.mp4"
encode_still "$captures/controls.png" 3 "$still_filter" "$segments/09-controls.mp4"
encode_still "$captures/mobile-landscape.png" 4 "$mobile_filter" "$segments/10-mobile.mp4"
encode_still "$work/features.png" 4 "$still_filter" "$segments/11-features.mp4"
encode_video "$captures/stage1-real-b.webm" 0 8 "$wide_filter" "$segments/12-gameplay.mp4"
encode_still "$work/end.png" 8 "$still_filter" "$segments/13-end.mp4"

concat_list="$work/master-concat.txt"
: > "$concat_list"
for segment in "$segments"/*.mp4; do
    printf "file '%s'\n" "$segment" >> "$concat_list"
done
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$concat_list" -c copy "$work/master-silent.mp4"

ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i 'sine=frequency=55:sample_rate=48000:duration=58' \
    -f lavfi -i 'sine=frequency=110:sample_rate=48000:duration=58' \
    -f lavfi -i 'sine=frequency=220:sample_rate=48000:duration=58' \
    -f lavfi -i 'anoisesrc=color=white:amplitude=0.08:duration=58:sample_rate=48000' \
    -filter_complex "[0:a]volume='0.22*(0.18+0.82*exp(-10*mod(t\\,0.5)))':eval=frame,lowpass=f=180[bass];\
[1:a]volume='0.055*(0.35+0.65*pow(sin(PI*t/4)\\,2))':eval=frame[mid];\
[2:a]volume='0.028*(0.45+0.55*pow(sin(PI*t/8)\\,2))':eval=frame[lead];\
[3:a]highpass=f=6500,volume='0.022*(0.12+0.88*exp(-22*mod(t\\,0.25)))':eval=frame[hats];\
[bass][mid][lead][hats]amix=inputs=4:normalize=0,afade=t=in:st=0:d=1,afade=t=out:st=54:d=4,loudnorm=I=-16:TP=-1.5:LRA=7[a]" \
    -map '[a]' -c:a pcm_s16le "$work/soundtrack.wav"

ffmpeg -hide_banner -loglevel error -y -i "$work/master-silent.mp4" -i "$work/soundtrack.wav" \
    -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart \
    -metadata title='Pepsiman Recompiled v1.0 — Launch Trailer' \
    "$output/Pepsiman-Recompiled-v1.0-master.mp4"

encode_still "$captures/settings.png" 3 "$still_filter" "$work/x-settings.mp4"
encode_still "$captures/pause-menu.png" 3 "$still_filter" "$work/x-pause.mp4"
encode_still "$captures/mobile-landscape.png" 3 "$mobile_filter" "$work/x-mobile.mp4"
encode_still "$work/end.png" 4 "$still_filter" "$work/x-end.mp4"

x_concat_list="$work/x-concat.txt"
: > "$x_concat_list"
for segment in \
    "$segments/01-gameplay.mp4" \
    "$segments/02-hook.mp4" \
    "$segments/05-original.mp4" \
    "$segments/06-enhanced.mp4" \
    "$work/x-settings.mp4" \
    "$work/x-pause.mp4" \
    "$work/x-mobile.mp4" \
    "$segments/11-features.mp4" \
    "$work/x-end.mp4"; do
    printf "file '%s'\n" "$segment" >> "$x_concat_list"
done
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$x_concat_list" -c copy "$work/x-silent.mp4"
ffmpeg -hide_banner -loglevel error -y -i "$work/x-silent.mp4" -i "$work/soundtrack.wav" \
    -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart \
    -metadata title='Pepsiman Recompiled v1.0 — X Launch Cut' \
    "$output/Pepsiman-Recompiled-v1.0-x.mp4"

echo "Rendered trailer outputs in $output"
