# Motion Graphics Standards — ATURAN PERMANEN

> Terkunci untuk SELURUH komposisi Remotion di proyek ini (viralin-next + turunannya).
> File ini adalah aturan permanen: setiap komposisi/animasi baru WAJIB mengikutinya
> tanpa pengecualian. Skill pendukung terpasang di `.agent/skills/` (21 skill:
> remotion-best-practices, remotion-markup, motion-graphics, remotion-bits,
> remotion-scenes, dll).

## 1. Kanvas vertikal: 1080x1920 (9:16) @ 30fps

- Semua komposisi video vertikal WAJIB `width: 1080, height: 1920, fps: 30`.
- Rasio 9:16 tidak boleh dilanggar; dilarang membuat komposisi landscape/square
  untuk konten TikTok/Reels/Shorts.
- `calculateMetadata` wajib dipakai bila durasi dinamis (dihitung dari props),
  fps dan resolusi tetap terkunci seperti di atas.
- Catatan migrasi: komposisi lama (`ViralKonten`, `MotionStudio`) masih merender
  internal 540x960 — komposisi BARU wajib 1080x1920, dan migrasi komposisi lama
  mengikuti (bobot render naik 4x, pertimbangkan konkurensi renderer).

## 2. Safe-zone mobile: 18% atas & 22% bawah KOSONG

- Area atas 18% (0 → 345.6px dari atas) dan area bawah 22% (1497.6 → 1920px)
  WAJIB kosong dari konten kritis (teks judul, caption, CTA, logo).
  Alasan: UI overlay TikTok/Reels/Shorts (username, tombol like/share, caption
  platform) menutupi area itu di perangkat nyata.
- Yang BOLEH masuk safe-zone hanya: background/illustration full-bleed,
  progress bar tipis, dan elemen dekoratif yang hilangnya tidak merusak pesan.
- Titik acuan praktis: konten kritis hidup di 346px → 1498px (fonds ≥ 34px
  untuk keterbacaan ponsel).

## 3. Animasi berbasis spring physics

- Semua gerak organik (punch-in, pop, slide, bounce) WAJIB memakai `spring()`
  dari Remotion dengan konfigurasi eksplisit `{ damping, stiffness, mass }` —
  BUKAN tween/linear.
- `interpolate()` hanya untuk: opacity/fade, exit clip (clamp), dan transisi
  linear murni (progress bar, sweep). Dilarang memakai `interpolate()` sebagai
  pengganti spring untuk scale/translate yang terlihat oleh mata.
- Konvensi konfigurasi yang dipakai proyek ini (jaga konsistensi):
  - punch-in besar: `{ damping: 11, stiffness: 170, mass: 0.55 }`
  - chip/badge pop: `{ damping: 10, stiffness: 200, mass: 0.4 }`
  - kata karaoke: `{ damping: 12, stiffness: 180, mass: 0.4 }`
- Setiap animasi wajib punya exit yang di-clamp (`extrapolateRight: "clamp"`)
  supaya tidak bocor keluar durasi scene.

## 4. WAJIB visual QA di browser bawaan sebelum selesai

Sebelum menyatakan pekerjaan motion graphics SELESAI, jalankan QA visual:

1. **Player preview + browser bawaan** (skill `agent-browser`):
   buka halaman preview (Player Remotion / studio), snapshot minimal pada
   viewport 375px (ponsel) — verifikasi: tidak ada overflow horizontal,
   teks tidak terpotong, safe-zone #2 benar-benar bersih, font sudah termuat
   (tidak ada FOUT pada frame pertama).
2. **Audit frame render server**: ekstrak frame representatif dengan
   `ffmpeg -ss <t> -i out.mp4 -frames:v 1` (hook, tiap scene, CTA) dan periksa
   gambar hasil ekstraksi — caption sinkron, warna aksen benar, tidak ada
   artefak/teks bocor dari gambar AI.
3. **Audit audio**: `ffmpeg volumedetect` — VO dominan, SFX tidak clipping
   (max ≤ -3 dB).
4. Bila ada satu saja pelanggaran → perbaiki, render ulang, QA ulang.
   Jangan pernah menyatakan selesai hanya karena script build sukses.

## 5. Konvensi kode komposisi

- Komposisi hidup di `viralin-next/remotion/`, registrasi di `Root.tsx`,
  durasi dinamis via `calculateMetadata`.
- Font dimuat via `delayRender` + `document.fonts` (pola `Anton VB` di
  `ViralKonten.tsx`) — jangan pernah render sebelum font siap.
- Aset eksternal (gambar/voice) via URL absolut `/api/asset/...` saat render
  server, path relatif saat Player browser.
- SFX sebagai track audio di dalam komposisi; VO di-mux ffmpeg pasca-render
  (`amix normalize=0` + alimiter, VO dominan).
