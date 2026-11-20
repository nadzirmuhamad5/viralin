#!/usr/bin/env bash
# Uji client yt-dlp mana yang lolos bot-check YouTube dari IP data center ini.
# Video uji: jEeGL9svOWk (dari error user).
YTDLP=/home/z/my-project/.deps/bin/yt-dlp
URL="https://www.youtube.com/watch?v=jEeGL9svOWk"

test_client() {
  local label="$1"; local ea="$2"
  local out="/tmp/yt-test-$label.mp4"; rm -f "$out"
  local args=(-q --no-playlist --no-warnings -f "b/bv*+ba" --max-filesize 80M -o "$out" "$URL")
  [ -n "$ea" ] && args+=(--extractor-args "$ea")
  if "$YTDLP" "${args[@]}" >/dev/null 2>"/tmp/yt-err-$label"; then
    if [ -s "$out" ]; then
      echo "OK     $label ($(du -h "$out" | cut -f1))"
    else
      echo "NOFILE $label"
    fi
  else
    echo "FAIL   $label : $(head -c 130 "/tmp/yt-err-$label" | tr '\n' ' ')"
  fi
}

test_client default ""
test_client tv "youtube:player_client=tv"
test_client android "youtube:player_client=android"
test_client mweb "youtube:player_client=mweb"
test_client tv_simply "youtube:player_client=tv_simply"
test_client web_embedded "youtube:player_client=web_embedded"
echo "selesai"
