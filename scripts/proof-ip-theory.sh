#!/usr/bin/env bash
# BUKTI TEORI IP: perintah yt-dlp PERSIS seperti yang dibangun YTSage
# (ytsage_downloader.py: tanpa cookies → --extractor-args youtube:player_client=web_embedded,default
#  + default download tanpa format_id → -S res:720)
YTDLP=/home/z/my-project/.deps/bin/yt-dlp
export PYTHONPATH=/home/z/my-project/.deps
URL="https://www.youtube.com/watch?v=jEeGL9svOWk"

echo "=== TES A — jalur YTSage TANPA cookies (web_embedded,default + -S res:720) ==="
$YTDLP --no-playlist --force-overwrites \
  --extractor-args "youtube:player_client=web_embedded,default" \
  -S "res:720" -o /tmp/yt-sage.mp4 "$URL" >/tmp/yt-sage.log 2>&1
code=$?
echo "exit=$code · file: $(ls -la /tmp/yt-sage.mp4 2>/dev/null | awk '{print $5"B"}' || echo 'tidak ada')"
grep -E "ERROR|Sign in|Too Many|not available" /tmp/yt-sage.log | head -2 | cut -c1-120

echo
echo "=== TES A2 — jalur YTSage DENGAN cookies file (default clients + --cookies) ==="
CK=/tmp/e2e-fake-cookies.txt
printf '# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t1900000000\tPREF\tf6=40000000\n' > "$CK"
$YTDLP --no-playlist --force-overwrites --cookies "$CK" -S "res:720" \
  -o /tmp/yt-sage2.mp4 "$URL" >/tmp/yt-sage2.log 2>&1
code2=$?
echo "exit=$code2 · file: $(ls -la /tmp/yt-sage2.mp4 2>/dev/null | awk '{print $5"B"}' || echo 'tidak ada')"
grep -E "ERROR|Too Many|not available|storyboard" /tmp/yt-sage2.log | head -2 | cut -c1-120

echo
echo "=== TES B — KONTROL: yt-dlp yang SAMA mengunduh mp4 non-YouTube dari IP yang ini ==="
$YTDLP --no-playlist -o /tmp/ctrl.mp4 "http://127.0.0.1:8080/e2e-ujian.mp4" >/tmp/ctrl.log 2>&1
code3=$?
echo "exit=$code3 · file: $(ls -la /tmp/ctrl.mp4 2>/dev/null | awk '{print $5"B"}' || echo 'tidak ada')"
