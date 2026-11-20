#!/usr/bin/env bash
# Probe client yt-dlp DENGAN cookies asli — cari client yang masih memberi stream video/audio.
YTDLP=/home/z/my-project/.deps/bin/yt-dlp
CK=/home/z/my-project/viralin-next/data/uploads/manual-yt-cookies.txt
URL="https://www.youtube.com/watch?v=jEeGL9svOWk"

probe() {
  local label="$1"; local ea="$2"
  local out="/tmp/yt-ck-$label.txt"
  "$YTDLP" --cookies "$CK" --no-warnings --extractor-args "$ea" --list-formats "$URL" >"$out" 2>&1
  local n
  n=$(grep -cE "^[0-9]+\s+(mp4|webm|m4a|3gp)" "$out")
  if [ "$n" -gt 0 ]; then
    echo "OK    $label : $n stream — contoh: $(grep -E '^[0-9]+\s+(mp4|webm|m4a|3gp)' "$out" | tail -2 | tr '\n' ' ' | cut -c1-90)"
  else
    echo "KOSONG $label : $(grep -E "ERROR|WARNING" "$out" | head -1 | cut -c1-100)"
  fi
}

probe tv "youtube:player_client=tv"
probe android "youtube:player_client=android"
probe ios "youtube:player_client=ios"
probe mweb "youtube:player_client=mweb"
probe tv_simply "youtube:player_client=tv_simply"
probe android_vr "youtube:player_client=android_vr"
echo selesai
