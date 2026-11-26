#!/usr/bin/env bash
# Start server Viralin (worker render) dengan env dependensi python yang benar.
# Dipakai manual & oleh cron keep-alive — JANGAN hardcode env di tempat lain.
set -e
cd /home/z/my-project/viralin-next
export VL_DEPS=/home/z/my-project/.deps      # edge-tts, faster-whisper, yt-dlp
export VL_HF_HOME=/home/z/my-project/.cache  # cache model whisper small
# kalau sudah hidup, selesai (idempotent)
if curl -s -o /dev/null --max-time 3 http://127.0.0.1:3000/; then
  echo "server sudah hidup"
  exit 0
fi
nohup npm start > /tmp/next-server.log 2>&1 &
for i in $(seq 1 20); do
  sleep 1
  if curl -s -o /dev/null --max-time 3 http://127.0.0.1:3000/; then
    echo "server hidup (port 3000) setelah ${i}s"
    exit 0
  fi
done
echo "GAGAL menyalakan server — lihat /tmp/next-server.log"
tail -5 /tmp/next-server.log
exit 1
