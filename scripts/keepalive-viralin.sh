#!/usr/bin/env bash
# Watchdog Viralin: cek tiap 60 detik, restart otomatis kalau :3000/:8080 mati.
# Jalankan (detached):  nohup bash scripts/keepalive-viralin.sh >/dev/null 2>&1 &
# Log: <repo>/deploy/keepalive.log
# CATATAN: watchdog ini hidup selama instance sandbox ini hidup. Kalau sandbox
# di-recycle total, jalankan lagi: bash scripts/restart-viralin.sh lalu watchdog
# di atas — atau sambungkan ke cron platform/agent kalau tersedia.
BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$BASE/deploy/keepalive.log"
mkdir -p "$BASE/deploy"
echo "[$(date '+%F %T')] watchdog start (pid $$)" >> "$LOG"
while true; do
  A=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:3000/ 2>/dev/null)
  B=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:8080/ 2>/dev/null)
  if [ "$A" != "200" ] || [ "$B" != "200" ]; then
    echo "[$(date '+%F %T')] down (3000=$A 8080=$B) → jalankan restart-viralin.sh" >> "$LOG"
    bash "$BASE/scripts/restart-viralin.sh" >> "$LOG" 2>&1
  fi
  # backup metadata riwayat ke git (commit hanya kalau ada job baru/berubah)
  bash "$BASE/scripts/backup-data.sh" >> "$LOG" 2>&1 || true
  sleep 60
done
