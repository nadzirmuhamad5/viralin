#!/usr/bin/env bash
# Jalankan semua proses worker Viralin dalam satu container:
# PO-token server (Deno) :4416, static server :8080, Next production :3000.
# Pola ini mengikuti scripts/restart-viralin.sh, disederhanakan untuk container:
# tanpa watchdog (platform me-restart container bila crash) dan tanpa rebuild
# (build sudah dilakukan saat image dibuat).
set -u

mkdir -p /app/viralin-next/data/jobs /app/viralin-next/data/uploads

# 1. PO-token server — wajib untuk YouTube dari IP data center.
if ! curl -s --max-time 3 http://127.0.0.1:4416/ping >/dev/null; then
  echo "[entrypoint] menyalakan PO-token server :4416…"
  (cd /app/pot-provider/bgutil-ytdlp-pot-provider/server \
    && /app/pot-provider/deno run -A src/main.ts >> /app/viralin-next/data/pot-server.log 2>&1 &)
fi

# 2. Static server :8080 (video uji + logo dari download/).
(cd /app/download && python3 -m http.server 8080 --bind 127.0.0.1 >> /app/viralin-next/data/http8080.log 2>&1 &)

# 3. Next production :3000 — proses utama (exec agar menerima sinyal stop).
echo "[entrypoint] menyalakan next start :3000…"
cd /app/viralin-next
exec ./node_modules/.bin/next start -H 0.0.0.0 -p 3000
