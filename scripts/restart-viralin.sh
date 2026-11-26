#!/usr/bin/env bash
# Restart Viralin MODE PRODUCTION (next start :3000 + static :8080) setelah recycle.
# Pakai: bash /home/z/my-project/scripts/restart-viralin.sh
# Pakai: REBUILD=1 bash …  → paksa build ulang dulu (kalau kodingan berubah)

set -u
BASE=/home/z/my-project
APP=$BASE/viralin-next
LOGDIR=$BASE/deploy
mkdir -p "$LOGDIR"
# env opsional (mis. VL_PROXY=http://user:pass@host:port) — tulis sekali di deploy/env,
# semua restart berikutnya otomatis memakainya.
if [ -f "$BASE/deploy/env" ]; then . "$BASE/deploy/env"; fi

# 1. node_modules hilang? install ulang dari cache (cepat)
if [ ! -x "$APP/node_modules/.bin/next" ]; then
  echo "[restart] node_modules hilang → npm install…"
  (cd "$APP" && npm install --no-audit --no-fund 2>&1 | tail -1)
fi

# 1b. .deps (yt-dlp/whisper/edge-tts) hilang? pasang ulang (+ plugin PO-token)
if [ ! -x "$BASE/.deps/bin/yt-dlp" ]; then
  echo "[restart] .deps hilang → pip install faster-whisper edge-tts yt-dlp yt-dlp-ejs…"
  mkdir -p "$BASE/.deps"
  pip install --target="$BASE/.deps" -q faster-whisper edge-tts yt-dlp yt-dlp-ejs bgutil-ytdlp-pot-provider 2>&1 | grep -v WARNING | tail -1
fi

# 1c. PO-token server (bgutil, Deno) — wajib utk YouTube dari IP data center
#     Recycle bisa menghapus pot-provider → pulihkan otomatis (deno + clone + install)
if [ ! -x "$BASE/pot-provider/deno" ]; then
  echo "[restart] deno hilang → unduh ulang…"
  mkdir -p "$BASE/pot-provider"
  (cd "$BASE/pot-provider" && curl -fsSL -o deno.zip \
    https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip \
    && unzip -oq deno.zip && rm deno.zip && chmod +x deno)
fi
if [ ! -f "$BASE/pot-provider/bgutil-ytdlp-pot-provider/server/src/main.ts" ]; then
  echo "[restart] kode server bgutil hilang → clone ulang…"
  git clone -q --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git \
    "$BASE/pot-provider/bgutil-ytdlp-pot-provider"
  (cd "$BASE/pot-provider/bgutil-ytdlp-pot-provider/server" \
    && DENO_DIR="$BASE/pot-provider/deno-cache" "$BASE/pot-provider/deno" install)
fi
if [ -x "$BASE/pot-provider/deno" ] && ! curl -s --max-time 3 http://127.0.0.1:4416/ping >/dev/null; then
  echo "[restart] menyalakan PO-token server :4416…"
  (cd "$BASE/pot-provider/bgutil-ytdlp-pot-provider/server" \
    && DENO_DIR="$BASE/pot-provider/deno-cache" nohup "$BASE/pot-provider/deno" run -A src/main.ts \
    >> "$LOGDIR/pot-server.log" 2>&1 &)
fi

# 1d. Metadata riwayat job dari backup git (backup-data/jobs — di-track repo).
#     Media/video tidak ikut (re-render kalau perlu); mtime fresh → tak dibuang TTL.
if [ ! -d "$APP/data/jobs" ] && [ -d "$APP/backup-data/jobs" ] && ls "$APP"/backup-data/jobs/*.json >/dev/null 2>&1; then
  echo "[restart] memulihkan metadata riwayat dari backup-data/…"
  mkdir -p "$APP/data/jobs"
  cp "$APP"/backup-data/jobs/*.json "$APP/data/jobs/"
fi

# 2. Build production bila belum ada / diminta
if [ ! -f "$APP/.next/BUILD_ID" ] || [ "${REBUILD:-0}" = "1" ]; then
  echo "[restart] build production…"
  pkill -f "next-server" 2>/dev/null; pkill -f "next start" 2>/dev/null; sleep 2
  (cd "$APP" && npm run build 2>&1 | grep -E "✓ Compiled|✓ Generating|error" | tail -3)
fi

# 3. Next PRODUCTION :3000 (bukan dev — stabil & cepat)
if ! curl -s -o /dev/null --max-time 5 http://127.0.0.1:3000/; then
  echo "[restart] menyalakan next start :3000…"
  (cd "$APP" && nohup "$APP/node_modules/.bin/next" start -H 0.0.0.0 -p 3000 >> "$LOGDIR/next-prod.log" 2>&1 &)
else
  echo "[restart] :3000 sudah hidup"
fi

# 4. Static server :8080 (video uji + logo)
if ! curl -s -o /dev/null --max-time 5 http://127.0.0.1:8080/; then
  echo "[restart] menyalakan http.server :8080 (download/)…"
  (cd "$BASE/download" && nohup python3 -m http.server 8080 --bind 127.0.0.1 > /tmp/http8080.log 2>&1 &)
else
  echo "[restart] :8080 sudah hidup"
fi

# 5. Tunggu sampai keduanya siap
for i in $(seq 1 45); do
  A=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:3000/)
  B=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:8080/)
  if [ "$A" = "200" ] && [ "$B" = "200" ]; then
    echo "[restart] ✅ semua hidup (production) — http://127.0.0.1:3000"
    exit 0
  fi
  sleep 2
done
echo "[restart] ⚠️ belum siap — cek $LOGDIR/next-prod.log"
exit 1
