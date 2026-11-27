# Motion Graphics Standards — WAJIB (LOCKED)

File ini adalah **aturan permanen** untuk semua produksi video/motion graphics di proyek
Viralin (komposisi Remotion, render ffmpeg, atau bentuk video apa pun). Standar ini
**terkunci** dan hanya boleh dilanggar bila user **secara eksplisit** meminta pengecualian
di permintaannya (mis. "buat landscape 16:9"). Default tanpa permintaan = patuh penuh.

---

## 1. Format Video Vertikal (LOCKED)

| Parameter  | Nilai WAJIB                        |
|------------|------------------------------------|
| Resolusi   | **1080 x 1920 px (9:16 vertikal)** |
| Frame rate | **30 fps** (konstan, bukan variabel) |
| Durasi default | 30-60 detik (shorts/reels), boleh beda bila user minta |
| Codec      | H.264 (libx264), yuv420p, +faststart |
| Audio      | AAC 160k, fade-out 0.3-0.5s di akhir |

- Jangan pernah render 16:9 atau persegi kecuali user minta eksplisit.
- Source gambar/video di-scale/crop ke 9:16 (bukan letterbox). `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`.
- Preview lokal boleh 540x960 (50%) demi kecepatan, tapi **file final selalu 1080x1920**.

## 2. Mobile Safe-Zone (LOCKED)

UI mobile (status bar, notch, caption platform, tombol share/like) menutupi bagian atas &
bawah layar. **Area konten aman:**

```
┌──────────────────┐  y=0
│  TOP SAFE-ZONE   │  18% tinggi = 346px  → KOSONG (bukan area narasi penting)
├──────────────────┤  y=346
│                  │
│   CONTENT AREA   │  tinggi 1152px (346 → 1498)
│   ( semua teks,  │
│     judul, chip, │
│     CTA di sini) │
│                  │
├──────────────────┤  y=1498
│ BOTTOM SAFE-ZONE │  22% tinggi = 422px  → KOSONG (bukan area narasi penting)
└──────────────────┘  y=1920
```

Aturan:
- **18% atas (0 → 346px)** dan **22% bawah (1498 → 1920px)**: tidak boleh ada teks,
  judul, CTA, logo, atau elemen yang harus terbaca. Dekorasi/blur/gradient boleh.
- Elemen interaktif/konten inti disimpan di **content area** (y = 346 → 1498).
- Margin samping minimal **64px** dari tepi kiri/kanan (1080px lebar).
- Overlay bawaan proyek yang menempati bawah (caption karaoke `marginV`, subtitle)
  dihitung bagian dari bottom zone — jangan tambah elemen penting lain di sana.
- Saat komposisi Remotion: gunakan konstanta ini, jangan hardcode angka mentah di
  banyak tempat — import dari satu sumber (mis. `lib/motion-standards.ts` bila dibuat).

## 3. Animasi Berbasis Spring Physics (LOCKED)

Semua animasi **motion** (posisi, skala, rotasi, opacity masuk/keluar) WAJIB pakai
**spring physics** — Remotion `spring()` atau ekivalen fisik — **BUKAN** tween linear
atau easestatik untuk gerakan yang terlihat.

- Wajib: `spring({ frame, fps, config })` dengan `fps: 30`.
- Rekomendasi config (dari halus ke snappy):
  - Halus/enter besar: `{ damping: 200, stiffness: 100, mass: 0.5 }`
  - Standar UI: `{ damping: 12, stiffness: 200, mass: 0.5 }`
  - Snappy/bouncy (rage/pop): `{ damping: 10, stiffness: 300, mass: 0.6 }`
- **Dilarang** untuk gerakan: `interpolate(frame, [...], [...], { easing: Linear })`
  sebagai pengganti spring pada translate/scale. Linear hanya boleh untuk nilai
  teknis non-visual (progress bar timing, buffer, dsb.).
- Transformasi selalu via `transform` CSS / properti Remotion (translate, scale,
  rotate) — bukan animasi layout (width/height) yang bikin jank.
- Durasi animasi masuk konten: 0.3-0.6s; stagger antar item 0.08-0.15s.
- Gerak kamera (zoom pan, ken-burns) boleh pakai `interpolate` halus (ease-in-out)
  karena bersifat kontinu, bukan "enter" motion — asal tidak jank di 30fps.

## 4. Visual QA Check di Browser (WAJIB SEBELUM SELESAI)

**Tidak ada pekerjaan motion graphics yang dianggap selesai tanpa QA visual di browser.**
"Compiles" / "build sukses" BUKAN bukti selesai.

Protokol wajib (pakai browser bawaan / agent-browser):

1. **Buka halaman preview** (localhost preview panel atau route preview komposisi).
2. **Screenshot minimal 5 titik waktu**: awal (hook), 25%, 50%, 75%, akhir (CTA).
   - Kalau komposisi statis: screenshot penuh.
   - Kalau video: ekstrak frame di titik-titik waktu (`ffmpeg -ss <t> -i out.mp4 -frames:v 1`).
3. **Periksa setiap frame:**
   - [ ] Resolusi & rasio 9:16 benar, tidak ada letterbox/stretch aneh.
   - [ ] Tidak ada teks/judul/CTA penting yang jatuh di top zone (18%) atau bottom zone (22%).
   - [ ] Tidak ada teks terpotong di tepi, tidak ada overflow, tidak ada teks dobel.
   - [ ] Tidak ada teks asing/bleed dari gambar AI (Cina/Jepang/dll) bila pakai AI image.
   - [ ] Kontras teks terbaca di atas background (outline/box ada bila perlu).
   - [ ] Animasi spring jalan (frame 25% ≠ frame 50% untuk elemen yang dianimasikan).
4. **Cek audio bila ada**: `ffmpeg volumedetect` → mean sehat (-25 s/d -14 dB), tidak clip.
5. **Bila ada masalah → perbaiki root cause → ULANGI QA dari langkah 1.** Jangan
   pernah menyebut selesai setelah hanya "sudah difix" tanpa verifikasi ulang.
6. Laporkan hasil QA ke user: sebutkan frame apa saja yang dicek dan temuannya.

---

## Ringkasan angka yang terkunci (copy-paste untuk konstanta)

```ts
export const MOTION_STANDARDS = {
  WIDTH: 1080,
  HEIGHT: 1920,
  FPS: 30,
  SAFE_TOP_PCT: 18,          // = 346px
  SAFE_BOTTOM_PCT: 22,       // = 422px
  CONTENT_TOP: 346,          // y mulai area aman
  CONTENT_BOTTOM: 1498,      // y akhir area aman
  CONTENT_HEIGHT: 1152,
  MARGIN_X: 64,
} as const;
```

## Skill pendukung (lihat `.agent/skills/`)

Satu salinan kanonis per skill, di top-level `.agent/skills/<nama>/`.
Folder bundle upstream (`skills/`, `remotion-motion-graphics-skill/`,
`claude-remotion-skill/`) sudah dihapus 27 Nov 2026 — isinya duplikat identik
dengan salinan kanonis di top-level, plus contoh/demo upstream yang tidak
dipakai proyek ini. Jangan instal ulang bundle tersebut.

| Folder | Isi |
|--------|-----|
| `remotion-best-practices/` dkk. | 14 skill resmi Remotion: best-practices, captions, render, multimedia, elements, dsb. |
| `motion-graphics/`, `cinematic-camera/`, `article-highlights/`, `terminal-inserts/` | 4 skill motion graphics |
| `remotion-motion-graphics/` | Skill remotion-motion-graphics + contoh |
| `remotion-scenes/` | 201+ scene siap pakai (src/scenes) |
| `remotion-bits/` | Komponen animasi jsrepo (SKILL.md di `remotion-bits/SKILL.md`) |

Ketika membuat komposisi baru: **baca dulu skill relevan** (minimal
`remotion-best-practices/SKILL.md` dan
`motion-graphics/SKILL.md`), baru tulis kode.

## 8. Hukum desain bang-motion (skill terpasang di `.agent/skills/bang-motion`)

Skill `bangtutorial/bang-motion` v1.19 (MIT) terpasang utuh — 25 skill kini.
Untuk SEMUA motion graphic (komposisi Remotion ATAU HTML+GSAP), hukum desainnya
mengikat di atas gaya apa pun:

1. **Ini video, bukan slide** — adegan berganti karena dunia/kamera bergerak,
   bukan section yang di-fade. Uji mekanisnya di SKILL.md "Larangan struktural"
   (hitung `<section`/`class="scene"`, tingkat teks per adegan, gerak tiap detik).
2. **Deterministik atau mati** — nol `Date.now()`/`Math.random()` di jalur
   render; semua visual fungsi murni waktu (di Remotion: fungsi murni `frame`,
   random pakai helper `rnd(i)` berbasis sin seperti di MotionStudio/ViralKonten).
3. **Gaya lahir dari tema** — style brief (palet dari brand/tema, font
   berkarakter, bahasa gerak latar `techniques.md` §7c, permukaan latar §7d
   ≥2 lapis, satu tanda tangan gerak, satu momen istimewa) ditulis SEBELUM
   kode; jangan salin kulit starter/referensi/proyek sebelumnya.
4. **Teks hidup, latar tunduk** — sentence case bobot 500-600 (kapital-tebal
   hanya satu adegan penekanan, mis. hook), tanpa titik otomatis di akhir
   kalimat pendek, ukuran/arah/posisi teks BERGANTIAN antar adegan (MotionStudio
   melakukannya lewat 3 varian layout BulletScene per idx%3), kantong teks
   kontras (luminance ≤25% atau ≥80%), glow hanya pada objek — judul bersih.
5. **Verifikasi visual per frame kunci** — contact sheet detik-detik kunci
   (ffmpeg select + tile, atau `scripts/snap.mjs` milik skill), bukan render
   penuh; menu gaya: `bang-motion/references/techniques.md`, jebakan umum:
   `bang-motion/references/anti-ppt.md`.
