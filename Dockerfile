# Viralin worker — Next.js :3000 + PO-token server (Deno) :4416 + static :8080.
# Satu image berisi semua proses worker; platform (Railway/Render/Fly.io)
# menjalankan container ini dan mengekspos port 3000.
#
# Yang TIDAK ada di image dan harus dipasok saat runtime:
#   - .z-ai-config (kredensial z-ai) — tanpa ini fitur LLM/gambar gagal,
#     sama seperti demo lokal kemarin. Pasok sebagai secret file.
#   - Volume persisten di /app/viralin-next/data (job + upload + cache model whisper).
#   - PORT platform harus 3000: lib/tools/motion-studio.ts memanggil
#     http://127.0.0.1:3000/api/asset/... (hardcode).
FROM node:24-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    VL_HF_HOME=/app/viralin-next/data/.cache/huggingface \
    DENO_DIR=/app/pot-provider/deno-cache

# ffmpeg + python + git (clone pot-provider) + unzip (deno) +
# pustaka sistem yang dibutuhkan Chromium headless (Remotion).
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip ffmpeg git curl unzip ca-certificates \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
      libpango-1.0-0 libcairo2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependensi Python worker (yt-dlp, faster-whisper, edge-tts) — sama seperti
# scripts/restart-viralin.sh §1b; dipasang ke viralin-next/.deps karena
# Next berjalan dengan cwd viralin-next/ (lihat lib/config.ts).
# CLI z-ai ikut terpasang dari paket ini (bin "z-ai" di z-ai-web-dev-sdk).
COPY viralin-next/package.json viralin-next/package-lock.json ./viralin-next/
RUN npm --prefix viralin-next ci --no-audit --no-fund \
 && npm install -g z-ai-web-dev-sdk \
 && pip install --target=/app/viralin-next/.deps --break-system-packages \
      faster-whisper edge-tts yt-dlp yt-dlp-ejs bgutil-ytdlp-pot-provider

# PO-token server (Deno + bgutil) — sama seperti restart-viralin.sh §1c.
RUN mkdir -p /app/pot-provider \
 && curl -fsSL -o /tmp/deno.zip https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip \
 && unzip -oq /tmp/deno.zip -d /app/pot-provider && rm /tmp/deno.zip \
 && git clone -q --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /app/pot-provider/bgutil-ytdlp-pot-provider \
 && (cd /app/pot-provider/bgutil-ytdlp-pot-provider/server && /app/pot-provider/deno install)

# Kode aplikasi + build production.
COPY . .
RUN npm --prefix viralin-next run build

VOLUME ["/app/viralin-next/data"]
EXPOSE 3000
ENTRYPOINT ["bash", "scripts/docker-entrypoint.sh"]
