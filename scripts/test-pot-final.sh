#!/usr/bin/env bash
# Probe terakhir: client berbeda + PO token provider, dengan/tanpa cookies.
YTDLP=/home/z/my-project/.deps/bin/yt-dlp
CK=/home/z/my-project/viralin-next/data/uploads/manual-yt-cookies.txt
URL="https://www.youtube.com/watch?v=jEeGL9svOWk"
export PYTHONPATH=/home/z/my-project/.deps

probe() {
  local label="$1"; shift
  local out="/tmp/yt-pot-$label.txt"
  "$YTDLP" --no-warnings "$@" --list-formats "$URL" >"$out" 2>&1
  local n
  n=$(grep -cE "^[0-9]+\s+(mp4|webm|m4a|3gp)" "$out")
  if [ "$n" -gt 0 ]; then
    echo "OK    $label : $n stream"
  else
    echo "KOSONG $label : $(grep -E "ERROR|needs to be reloaded|player response" "$out" | head -1 | cut -c1-110)"
  fi
}

probe web_ck --cookies "$CK" --extractor-args "youtube:player_client=web"
probe mweb_ck --cookies "$CK" --extractor-args "youtube:player_client=mweb"
probe tv_ck --cookies "$CK" --extractor-args "youtube:player_client=tv"
probe web_nock --extractor-args "youtube:player_client=web"
probe default_nock
echo selesai
