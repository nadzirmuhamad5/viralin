#!/usr/bin/env bash
# Buat asset uji E2E: download/e2e-ujian.mp4 (±30s, suara edge-tts bahasa Indonesia,
# cocok untuk klip-ai/transcript/dubbing). Regenerasi setelah recycle.
set -eu
BASE=/home/z/my-project
DEPS=$BASE/.deps
OUT=$BASE/download/e2e-ujian.mp4
TXT=/tmp/e2e-naskah.txt
TTL=/tmp/e2e-judul.txt
SP=/tmp/e2e-speech.mp3

if [ -s "$OUT" ]; then echo "skip — $OUT sudah ada ($(stat -c%s "$OUT")B)"; exit 0; fi
export PYTHONPATH="$DEPS"

cat > "$TXT" <<'EOF'
Tiga fakta kopi susu gula aren yang bikin nagih. Pertama, kombinasi gula aren dan kopi robusta menghasilkan rasa karamel yang lebih tebal dibanding susu biasa. Kedua, versi paling viral di Indonesia menggunakan es batu yang lebih sedikit supaya rasa kopi tetap dominan. Ketiga, racikan paling murah hanya butuh lima bahan dan bisa dibuat dalam dua menit di rumah. Coba hari ini, dan rasakan bedanya.
EOF
echo "VIRALIN E2E UJIAN" > "$TTL"

echo "[e2e] sintesis suara edge-tts…"
python3 "$BASE/viralin-next/worker/tts.py" \
  --voice id-ID-ArdiNeural --text-file "$TXT" --out "$SP" --rate "+4%"

echo "[e2e] merender video uji…"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=0x0b0f0e:s=640x360:d=32:r=25" \
  -i "$SP" \
  -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:textfile=$TTL:fontcolor=white:fontsize=40:x=(w-text_w)/2:y=40" \
  -shortest -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p \
  -c:a aac -b:a 96k -movflags +faststart "$OUT"

echo "[e2e] jadi: $(stat -c%s "$OUT")B · durasi $(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT")s"
