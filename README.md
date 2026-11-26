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
  app/               # halaman + API: /api/jobs (antrean + redaksi cookies), /api/jobs/<id>,
                     # /api/upload (streaming), media w/ Range (suffix range didukung)
  components/        # ToolRunner (form+polling), JobPanel (hasil)
  lib/               # pipeline.ts (klip-ai) · tools/ (16 tool = 1 modul/file) · toolrun.ts (dispatcher tipis)
                     # mediakit.ts · whisperd.ts (worker whisper resident) · queue.ts (antrean konkurensi)
                     # store.ts (disk = sumber kebenaran) · captions.ts (30 preset ASS) · config.ts · exec.ts
                     # use-job-polling.ts + ui.ts (shared client)
  worker/            # whisper_server.py (resident, model dimuat sekali) + transcribe.py (fallback per-proses)
                     # tts.py (edge-tts) · sports.py (energi)
  assets/caption-fonts/  # font libass: Anton, Bebas Neue, Archivo Black, Montserrat
scripts/             # restart-viralin.sh, fetch-fonts.sh, make-e2e-asset.sh, probe-ytdlp.sh (probe yt-dlp
                     # terparameterisasi), test-all-tools.py, test-cookies-flow.py, proof-ip-theory.sh
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

## Efisiensi (hasil refactor)

- **Whisper resident worker** — model faster-whisper dimuat sekali per proses
  (`worker/whisper_server.py`, JSON-lines via stdin), diclient-kan `lib/whisperd.ts`.
  Transkrip ke-2 dst. hemat 3–6 detik load model; worker idle-exit otomatis (hemat RAM)
  dan respawn saat dipakai. Fallback ke spawn per-proses bila worker tak tersedia.
- **Antrean konkurensi** — `lib/queue.ts` membatasi pipeline paralel (`VL_MAX_CONCURRENT`,
  default 2); antrian penuh → HTTP 429 + Retry-After. Dulu tiap POST langsung spawn
  pipeline tanpa batas (CPU/RAM mudah jebol).
- **Keamanan** — cookies YouTube user TIDAK PERNAH keluar dari server (diredaksi di semua
  respons API); logo Brand Kit divalidasi anti-SSRF (blokir host internal/privat + cek
  magic bytes gambar); scoreboard drawtext di-escape penuh (termasuk `%`).
- **Type-check build aktif kembali** — `tsc --noEmit` 0 error (dulu `ignoreBuildErrors: true`).
- **Store tahan banting** — persist atomik (tmp+rename), bacaan selalu sinkron ke disk
  (tahan hot-reload/multi-instance dev), TTL penyapu job/upload lama (`VL_TTL_HOURS`,
  default 48 jam) supaya disk tidak menumpuk tanpa batas.
- **I/O efisien** — upload streaming ke disk (dulu buffer 200MB di RAM), merge-video
  deduplikasi URL sama, dubbing TTS paralel (pool 4), music-gen 4 panggilan ffmpeg total
  (dulu 1 proses per segmen chord), deteksi scene decode di 160×90 (hemat CPU 20–50×).
- **Duplikasi dibasmi** — exec/config terpusat (`lib/exec.ts` + `lib/config.ts`), tool
  pecah per-file di `lib/tools/` dengan registry statis, hook polling bersama
  (`lib/use-job-polling.ts`), 5 skrip probe yt-dlp dilebur jadi `scripts/probe-ytdlp.sh`.

## Env var

| Var | Fungsi |
|---|---|
| `VL_PROXY` | proxy residential utk semua panggilan yt-dlp |
| `VL_WHISPER_MODEL` | model faster-whisper (default `small`) |
| `VL_WHISPER_LANGUAGE` | bahasa transkrip (default `id`) |
| `VL_MAX_SECONDS` | batas durasi video (default 900) |
| `VL_KEEP_ASS` | `1` = jangan hapus file .ass hasil render |
| `VL_MAX_CONCURRENT` | pipeline paralel maksimal (default 2) |
| `VL_MAX_WAITING` | antrian menunggu maksimal sebelum 429 (default 12) |
| `VL_TTL_HOURS` | usia job/media/upload sebelum disapu (default 48) |
| `VL_WHISPERD_IDLE_MS` | worker whisper keluar setelah idle sekian ms (default 600000) |
| `VL_DEPS` | folder dependensi python (default `<cwd>/.deps`) |
| `VL_HF_HOME` | cache model HuggingFace (default `<cwd>/.cache/huggingface`) |
| `VL_ZAI` | path/binary CLI z-ai (default `z-ai`) |

## Disclaimer

Demo edukasi tanpa login/pembayaran. Angka & tier harga di-capture dari klipers.pro
(18 Nov 2026) sebagai perbandingan. 3 fitur bertanda PRO (Split Cam, Clone Suara,
Auto Upload) butuh infrastruktur berbayar dan sengaja tidak dipalsukan. Patuhi ToS
platform & hak cipta saat mengunduh/mengolah video pihak lain.
