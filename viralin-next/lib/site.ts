/** Data konten lintas-halaman (landing / harga / tentang) — dipakai bareng. */

export const HARGA = [
  {
    nama: "Basic",
    tag: "Untuk coba-coba rutin",
    old: "Rp 60.000",
    now: "Rp 54.000",
    per: "/bln",
    save: "Hemat Rp 6.000",
    fitur: [
      "60 menit upload / bulan",
      "Caption auto dari transkrip",
      "Render 9:16 tanpa watermark",
      "Export MP4 540×960",
    ],
    hot: false,
  },
  {
    nama: "Pro",
    tag: "Buat creator full-time",
    old: "Rp 165.000",
    now: "Rp 90.750",
    per: "/bln",
    save: "Hemat Rp 74.250",
    fitur: [
      "300 menit upload / bulan",
      "Pemilihan momen otomatis (scene + ujaran)",
      "Prioritas antrian render",
      "Riwayat job persisten",
    ],
    hot: true,
  },
  {
    nama: "Enterprise",
    tag: "Buat agensi & tim",
    old: "Rp 250.000",
    now: "Rp 137.500",
    per: "/bln",
    save: "Hemat Rp 112.500",
    fitur: [
      "1.000 menit upload / bulan",
      "Akses REST API penuh",
      "Antrian render tercepat",
      "Dukungan prioritas",
    ],
    hot: false,
  },
  {
    nama: "Lifetime",
    tag: "Bayar sekali, selamanya",
    old: "Rp 1.550.000",
    now: "Rp 1.085.000",
    per: " sekali bayar",
    save: "Hemat Rp 465.000",
    fitur: [
      "Tanpa batas menit*",
      "Semua fitur Enterprise",
      "Update fitur gratis selamanya",
      "*model whisper sesuai kapasitas server",
    ],
    hot: false,
  },
];

export const FAQ: Array<[string, string]> = [
  [
    "Apakah Viralin gratis digunakan?",
    "Demo di sandbox ini sepenuhnya gratis dan tanpa login — paste link, proses, unduh. Struktur harga meniru paket asli klipers.pro sebagai perbandingan, bukan tagihan sungguhan.",
  ],
  [
    "Platform apa saja yang didukung?",
    "Semua sumber yang bisa di-scrape yt-dlp: YouTube, TikTok, Instagram, dan URL file .mp4 langsung. Catatan jujur: YouTube/TikTok sering memblokir IP data center (bot check) — dari server ini, URL file langsung paling andal. Kena \"Sign in to confirm you're not a bot\" di YouTube? Unggah cookies.txt di form tool (bagian Cookies) — ikuti panduan singkat di bawah kolomnya.",
  ],
  [
    "Berapa lama prosesnya?",
    "Video 1 menit selesai ±25–40 detik di server 2-core ini (model Whisper sudah tercache), termasuk unduh, transkrip, dan render 2–3 klip 9:16 dengan caption. Video lebih panjang proporsional lebih lama.",
  ],
  [
    "Bisakah saya mengedit caption?",
    "Caption dibakar otomatis dari timestamp kata faster-whisper dengan 30 preset gaya yang spec-nya diekstrak persis dari klipers.pro (font, warna highlight, outline, animasi pop — mulai Impact/Hormozi, Street, Outline, Karaoke, dll). Pilih gaya di kotak input sebelum proses.",
  ],
  [
    "Apakah Anda menyediakan API?",
    "Ya, semua endpoint terbuka di server demo: POST /api/jobs untuk buat job, GET /api/jobs untuk daftar, GET /api/jobs/<id> untuk status, dan GET /api/jobs/<id>/media/<file> untuk unduh klip (mendukung HTTP Range).",
  ],
  [
    "Apa itu sistem kredit?",
    "Di produk asli, kredit adalah kuota menit video yang diproses tiap bulan. Demo ini tidak memakai kredit — batasnya teknis: 15 menit per video dan maksimal 3 klip per job.",
  ],
  [
    "Apa keunggulan dibanding editing manual?",
    "Transkrip ber-timestamp, pemilihan momen berdasarkan kepadatan ujaran + cut scene, dan render 9:16 berjalan tanpa tangan dalam satu antrian. Kamu tinggal pilih klip mana yang mau diunggah.",
  ],
  [
    "Apakah bisa untuk konten gaming?",
    "Bisa, asalkan ada ujaran — skor momen mengutamakan kepadatan bicara. Video musik atau hening tetap diproses: momen dipilih dari deteksi cut scene sebagai cadangan.",
  ],
];

export const FAQ_HARGA: Array<[string, string]> = [
  [
    "Apakah harga ini tagihan sungguhan?",
    "Tidak. Angka & tier di halaman ini di-capture dari klipers.pro (18 Nov 2026) sebagai bahan perbandingan — demo ini gratis, tanpa login, tanpa pembayaran. Di produk asli pembayaran pakai QRIS.",
  ],
  [
    "Kenapa ada 4 tier — bedanya apa?",
    "Basic untuk volume kecil (60 menit/bln), Pro untuk creator aktif (300 menit + prioritas render), Enterprise untuk agensi (1.000 menit + REST API), Lifetime bayar sekali tanpa batas menit. Di demo ini semua tier dibuka gratis — batasnya hanya kapasitas server.",
  ],
  [
    "Fitur PRO di grid fitur itu apa?",
    "Tiga fitur (Split Cam, Clone Suara, Auto Upload) butuh infrastruktur berbayar di luar server ini: model CV ber-GPU, training suara, dan OAuth platform YouTube/TikTok/IG. Demi jujur, fitur itu ditandai PRO dan tidak dipalsukan — sisanya 17 tool benar-benar dieksekusi.",
  ],
];

export const CARA_KERJA: Array<[string, string, string]> = [
  [
    "1",
    "Tempel link atau isi form",
    "URL video (.mp4 langsung paling andal), atau isi form tool lain — naskah, judul, prompt, mood musik. Semua tanpa login.",
  ],
  [
    "2",
    "Pipeline berjalan di server",
    "Unduh yt-dlp (opsional cookies.txt anti bot-check) → transkrip faster-whisper → analisis momen/LLM → render ffmpeg dengan caption gaya klipers. Progress tiap tahap tampil live.",
  ],
  [
    "3",
    "Unduh hasilnya",
    "Klip 9:16 ber-caption, transkrip SRT/TXT, gambar AI, MP3 suara — semua bisa dipratinjau dan diunduh langsung.",
  ],
];

export const STACK: Array<[string, string, string]> = [
  ["Unduh video", "yt-dlp", "YouTube, TikTok, Instagram, URL file langsung"],
  ["Transkrip", "faster-whisper (small, id)", "Timestamp per kata untuk caption karaoke"],
  ["Render", "ffmpeg (filter graph)", "Crop 9:16, subtitle ASS, loudnorm, klip & loop"],
  ["Suara", "edge-tts", "Voiceover neural Indonesia & multibahasa, tanpa API key"],
  ["Teks AI", "GLM (z-ai)", "Optimasi judul, ide viral, naskah konten-tempel, prompt pro"],
  ["Gambar AI", "z-ai image-gen", "Thumbnail, background faceless, aset konten"],
  ["Frontend", "Next.js + React", "Multi-page: landing, 20 halaman fitur, harga, tentang, kontak"],
];
