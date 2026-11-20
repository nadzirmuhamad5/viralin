# Viralin — Klip Viral Otomatis (demo edukasi)

Demo alur **klipers.pro** dengan stack 100% gratis dan **benar-benar dieksekusi** di server:
`yt-dlp` · `faster-whisper` · `ffmpeg` · `edge-tts` · GLM via `z-ai` CLI.

Tempel URL video → pipeline memilih momen terbaik (kepadatan ujaran + deteksi cut scene) →
render **klip 9:16 + caption karaoke word-level** (30 preset gaya) → unduh. Plus 20 tool:
transkrip SRT/VTT, merge, loop boomerang, WA Story HD, watermark, highlight bola (puncak
energi audio), motion intro, konten faceless (naskah LLM → TTS → background AI → caption),
dubbing, music prosedural, optimasi judul LLM, thumbnail, gambar AI, dsb.

## Struktur

```
viralin-next/        # aplikasi Next.js 16 (App Router, TypeScript)
  app/               # halaman + API: /api/jobs, /api/jobs/<id>, /api/upload, media w/ Range
  components/        # ToolRunner (form+polling), JobPanel (hasil)
  lib/               # pipeline.ts (klip-ai), toolrun.ts (16 tool), mediakit.ts,
                     # captions.ts (30 preset ASS), store.ts (persist data/jobs), exec.ts
  worker/            # transcribe.py (faster-whisper), tts.py (edge-tts), sports.py (energi)
  assets/caption-fonts/  # font libass: Anton, Bebas Neue, Archivo Black, Montserrat
scripts/             # restart-viralin.sh, fetch-fonts.sh, make-e2e-asset.sh, proof-ip-theory.sh
download/            # file yang disajikan static :8080 (asset uji e2e-ujian.mp4 di-generate)
```

## Menjalankan

```bash
# 1. dependensi python → .deps (di-PYTHONPATH-kan oleh app)
pip install --target=.deps yt-dlp faster-whisper edge-tts bgutil-ytdlp-pot-provider

# 2. font caption + asset uji
bash scripts/fetch-fonts.sh
bash scripts/make-e2e-asset.sh      # butuh edge-tts + ffmpeg

# 3. build & start (next :3000 + static :8080 + PO-token server :4416)
cd viralin-next && npm install && npm run build && cd ..
bash scripts/restart-viralin.sh

# 4. PO-token server (bgutil, wajib untuk YouTube dari IP data center)
git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider pot-provider/bgutil-ytdlp-pot-provider
cd pot-provider/bgutil-ytdlp-pot-provider/server && npm install
# binary Deno: https://github.com/denoland/deno/releases → pot-provider/deno
```

Lalu buka `http://127.0.0.1:3000`. API: `POST /api/jobs {tool, inputs:{...}}`, `GET /api/jobs/<id>`.

## YouTube dari IP data center (temuan lapangan)

Tiga lapis blok, diuji sistematis (`scripts/proof-ip-theory.sh`, `scripts/probe-pot2.sh`):

1. **Bot-check** "Sign in to confirm you're not a bot" → lolos dengan **cookies.txt**
   (upload ATAU **paste langsung** di form — backend menyimpannya sebagai file otomatis).
2. **PO Token** → dipecahkan dengan **bgutil-ytdlp-pot-provider** (server Deno :4416 +
   plugin yt-dlp; diaktifkan otomatis via `PYTHONPATH=.deps`).
3. **Blokir level IP pada stream googlevideo** → dengan cookies + PO token valid pun
   `--list-formats` hanya memberi storyboard (0 stream) — `ios`/`android_vr` ditolak mentah,
   `mweb`/`web_safari`/`tv_samsung` dapat token tapi tetap 0 stream. Satu-satunya solusi:
   **proxy residential** — `VL_PROXY=http://user:pass@host:port` saat menyalakan server
   (otomatis diwariskan ke semua panggilan yt-dlp).

Perbandingan dengan [YTSage](https://github.com/oop7/YTSage): dari bedah kodenya, YTSage
tidak memakai client ios/android/tv — hanya `web_embedded,default` saat tanpa cookies dan
client default saat pakai cookies (file atau `--cookies-from-browser`). Dia berjalan karena
eksekusinya di IP rumah user; perintah persisnya diuji dari IP data center ini dan gagal
(TES A/A2), sementara yt-dlp yang sama sukses untuk sumber non-YouTube (TES B).

## Env var

| Var | Fungsi |
|---|---|
| `VL_PROXY` | proxy residential utk semua panggilan yt-dlp |
| `VL_WHISPER_MODEL` | model faster-whisper (default `small`) |
| `VL_WHISPER_LANGUAGE` | bahasa transkrip (default `id`) |
| `VL_MAX_SECONDS` | batas durasi video (default 900) |
| `VL_KEEP_ASS` | `1` = jangan hapus file .ass hasil render |

## Disclaimer

Demo edukasi tanpa login/pembayaran. Angka & tier harga di-capture dari klipers.pro
(18 Nov 2026) sebagai perbandingan. 3 fitur bertanda PRO (Split Cam, Clone Suara,
Auto Upload) butuh infrastruktur berbayar dan sengaja tidak dipalsukan. Patuhi ToS
platform & hak cipta saat mengunduh/mengolah video pihak lain.
