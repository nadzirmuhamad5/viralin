#!/usr/bin/env bash
# Probe client yt-dlp DENGAN cookies + bgutil PO server hidup (yang belum pernah dicoba).
YTDLP=/home/z/my-project/.deps/bin/yt-dlp
CK=/home/z/my-project/viralin-next/data/uploads/manual-yt-cookies.txt
URL="https://www.youtube.com/watch?v=jEeGL9svOWk"
export PYTHONPATH=/home/z/my-project/.deps

probe() {
  local label="$1"; local client="$2"
  local out="/tmp/yt-ck2-$label.txt"
  "$YTDLP" --cookies "$CK" --no-warnings --extractor-args "youtube:player_client=$client" --list-formats "$URL" >"$out" 2>&1
  local n
  n=$(grep -cE "^[0-9]+\s+(mp4|webm|m4a|3gp)" "$out")
  if [ "$n" -gt 0 ]; then
    echo "OK     $label : $n stream — contoh: $(grep -E '^[0-9]+\s+(mp4|webm|m4a|3gp)' "$out" | tail -2 | tr '\n' ' ' | cut -c1-90)"
  else
    echo "KOSONG $label : $(grep -E "ERROR|WARNING" "$out" | head -1 | cut -c1-105)"
  fi
  grep -o "pot:bgutil:http.*" "$out" | head -1 | sed 's/^/       ↳ /'
}

probe ios "ios"
probe android_vr "android_vr"
probe mweb "mweb"
probe web_safari "web_safari"
probe tv_samsung "tv_samsung"
echo selesai
