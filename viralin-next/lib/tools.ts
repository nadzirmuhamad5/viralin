/** Registry SEMUA fitur — meniru grid tool dashboard klipers.pro.
 *  Nilai `pro: true` = butuh infra berbayar/credential platform (jujur di UI),
 *  sisanya diimplementasikan nyata di server ini dengan stack gratis:
 *  ffmpeg · faster-whisper · edge-tts · z-ai LLM (GLM) · z-ai image gen. */

export type ToolField = {
  key: string;
  label: string;
  type: "url" | "text" | "textarea" | "number" | "select" | "upload";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  default?: string;
  hint?: string;
};

export type ToolDef = {
  id: string;
  name: string;
  icon: string;
  group: "Kliping AI" | "Editor & Komposisi" | "AI Generatif" | "SEO & Analitik" | "Distribusi";
  badge?: "NEW" | "VIRAL" | "PRO" | "GRATIS";
  desc: string;
  /** false = tampil di UI tapi belum bisa jalan (butuh infra berbayar) */
  live: boolean;
  fields: ToolField[];
};

const SOURCE_FIELD: ToolField = {
  key: "source", label: "Video sumber", type: "url",
  placeholder: "https://contoh.com/video.mp4 atau URL YouTube/TikTok",
  required: true,
  hint: "YouTube kena bot-check? Paste isi cookies.txt di bagian Cookies di bawah (lihat panduannya).",
};

export const TOOLS: ToolDef[] = [
  {
    id: "klip-ai", name: "Analisis AI", icon: "🤖", group: "Kliping AI", badge: "GRATIS", live: true,
    desc: "URL video → AI pilih momen viral → klip 9:16 + caption karaoke 30 preset klipers.",
    fields: [
      SOURCE_FIELD,
      { key: "preset", label: "Gaya caption", type: "select", default: "bold-impact",
        options: [], hint: "Diisi otomatis dari picker preset." },
      { key: "min_score", label: "Skor viral min (1–10)", type: "number", default: "7",
        hint: "Momen di bawah skor ini tidak diambil. Kalau tidak ada yang mencapai, ambil 3 skor tertinggi." },
      { key: "max_clips", label: "Maks klip", type: "number", default: "6",
        hint: "Maksimal klip yang dibuat per video." },
      { key: "min_dur", label: "Durasi klip min (detik)", type: "number", default: "15" },
      { key: "max_dur", label: "Durasi klip maks (detik)", type: "number", default: "45" },
    ],
  },
  {
    id: "split-cam", name: "Split Cam", icon: "🪟", group: "Kliping AI", badge: "PRO", live: false,
    desc: "Pisah facecam & gameplay/podcast otomatis. Butuh model CV ber-GPU — belum di demo gratis ini.",
    fields: [SOURCE_FIELD],
  },
  {
    id: "seamless-loop", name: "Loop Video", icon: "🔁", group: "Editor & Komposisi", live: true,
    desc: "Boomerang mulus (maju-mundur) untuk konten looping.",
    fields: [
      SOURCE_FIELD,
      { key: "start", label: "Mulai (detik)", type: "number", default: "0" },
      { key: "dur", label: "Durasi loop (detik)", type: "number", default: "6" },
    ],
  },
  {
    id: "konten-tempel", name: "VIRAL Content Creator", icon: "🚀", group: "AI Generatif", badge: "VIRAL", live: true,
    desc: "Satu ide → naskah LLM → suara TTS → background AI / B-Roll video → video vertikal ber-caption. Faceless, gratis.",
    fields: [
      { key: "topik", label: "Ide / topik (kalau kosong, pakai naskah)", type: "text",
        placeholder: "3 fakta kopi susu gula aren bikin nagih" },
      { key: "naskah", label: "Atau naskah sendiri", type: "textarea",
        placeholder: "Tulis naskah lengkap di sini… (kalau diisi, topik diabaikan)" },
      { key: "voice", label: "Suara", type: "select", default: "id-ID-ArdiNeural",
        options: [
          { value: "id-ID-ArdiNeural", label: "Ardi — Pria 🇮🇩" },
          { value: "id-ID-GadisNeural", label: "Gadis — Wanita 🇮🇩" },
          { value: "en-US-AndrewMultilingualNeural", label: "Andrew — multibahasa" },
          { value: "en-US-AvaMultilingualNeural", label: "Ava — multibahasa" },
        ] },
      { key: "bg", label: "Background", type: "select", default: "ai",
        options: [
          { value: "ai", label: "Gambar AI (z-ai)" }, { value: "gradient", label: "Gradient polos" },
          { value: "broll-auto", label: "B-Roll video (otomatis: YouTube → Pexels)" },
          { value: "broll-yt", label: "B-Roll YouTube" },
          { value: "broll-pexels", label: "B-Roll Pexels (butuh PEXELS_API_KEY)" },
        ] },
      { key: "preset", label: "Gaya caption", type: "select", default: "bold-impact",
        options: [], hint: "Diisi otomatis dari picker preset." },
    ],
  },
  {
    id: "ugc-affiliate", name: "UGC Tiru Konten", icon: "🧬", group: "AI Generatif", badge: "NEW", live: true,
    desc: "Upload avatar + foto produk + link video viral → AI bedah beat-nya → naskah UGC BARU + STORYBOARD visual (frame terhubung garis) + avatar AI dari prompt + voiceover + SRT. Meniru struktur, bukan kata-kata.",
    fields: [
      SOURCE_FIELD,
      { key: "produk", label: "Nama produk affiliate", type: "text", required: true,
        placeholder: "mis. Serum Vitamin C Glowing 20ml",
        hint: "Produk yang kamu daftarkan di TikTok Shop affiliate." },
      { key: "produk_upload", label: "Foto produk (opsional)", type: "upload",
        hint: "Tampil di storyboard sebagai referensi visual produk." },
      { key: "avatar_upload", label: "Foto avatar / wajah creator (opsional)", type: "upload",
        hint: "Kalau diisi, dipakai sebagai wajah di storyboard. Kalau kosong, AI buat dari prompt di bawah." },
      { key: "avatar_prompt", label: "Prompt avatar AI (kalau foto kosong)", type: "textarea",
        default: "Creator UGC wanita Indonesia usia 24, ramah dan energik, selfie di kamar rapi dengan lampu hangat, gaya realistis seperti diambil HP depan",
        hint: "Avatar digenerate AI gambar gratis — tanpa perlu foto asli." },
      { key: "storyboard", label: "Mode storyboard", type: "select", default: "ai",
        options: [
          { value: "ai", label: "Gambar AI per frame (visual penuh, lebih lama)" },
          { value: "teks", label: "Teks saja (cepat, tanpa gambar)" },
        ],
        hint: "Storyboard = rangkaian frame bernomor yang terhubung garis waktu, gaya resep storyboard HyperFrames." },
      { key: "video_engine", label: "Mesin video jadi", type: "select", default: "auto",
        options: [
          { value: "auto", label: "Otomatis — coba AI video dulu, kuota habis → remix footage referensi" },
          { value: "remix", label: "Remix footage referensi (footage asli bergerak, selalu jalan)" },
          { value: "zai", label: "AI video per frame (image-to-video, gratis berkuota)" },
          { value: "kenburns", label: "Gambar storyboard bergerak (Ken Burns, tercepat)" },
        ],
        hint: "Semua gratis. Remix = potongan asli video referensi di-mirror+grade+crop 9:16 lalu dikasih voiceover & caption baru — hasilnya footage BERGERAK, bukan foto. AI video menghidupkan frame storyboard jadi video bergerak (bisa kena kuota)." },
      { key: "cta", label: "CTA affiliate (opsional)", type: "text",
        default: "Cek keranjang kuning sekarang sebelum promo habis!" },
      { key: "niche", label: "Niche / gaya akun (opsional)", type: "text",
        placeholder: "mis. skincare, gadget murah, mom & baby" },
      { key: "durasi", label: "Target durasi naskah (detik)", type: "number", default: "30" },
      { key: "voice", label: "Suara voiceover", type: "select", default: "id-ID-ArdiNeural",
        options: [
          { value: "id-ID-ArdiNeural", label: "Ardi — Pria 🇮🇩" },
          { value: "id-ID-GadisNeural", label: "Gadis — Wanita 🇮🇩" },
          { value: "en-US-AndrewMultilingualNeural", label: "Andrew — multibahasa" },
          { value: "en-US-AvaMultilingualNeural", label: "Ava — multibahasa" },
        ] },
    ],
  },
  {
    id: "ragebait", name: "Rage Bait Studio", icon: "🔥", group: "AI Generatif", badge: "NEW", live: true,
    desc: "Short rage bait ala kreator YouTube ID: hook provokatif + 3 momen nyebelin bernomor, ilustrasi komik AI, narasi gue/lu, karaoke merah, TTS pace cepat. Preset rage terkunci — tinggal isi topik.",
    fields: [
      { key: "topik", label: "Topik yang bikin darah naik (kalau kosong, pakai naskah)", type: "text",
        placeholder: "penumpang angkot paling nyebelin" },
      { key: "naskah", label: "Atau naskah sendiri (1 baris = 1 blok: hook, momen…, cta)", type: "textarea",
        placeholder: "INI YANG BIKIN DARAH NAIK\nMomen pertama nyebelin…\nMomen kedua makin parah…\nFOLLOW SEKARANG" },
      { key: "voice", label: "Suara", type: "select", default: "id-ID-ArdiNeural",
        options: [
          { value: "id-ID-ArdiNeural", label: "Ardi — Pria 🇮🇩" },
          { value: "id-ID-GadisNeural", label: "Gadis — Wanita 🇮🇩" },
          { value: "en-US-AndrewMultilingualNeural", label: "Andrew — multibahasa" },
          { value: "en-US-AvaMultilingualNeural", label: "Ava — multibahasa" },
        ], hint: "dibacakan cepat +12% — pace khas shorts rage bait" },
    ],
  },
  {
    id: "motion-studio", name: "Motion Studio", icon: "🎬", group: "Editor & Komposisi", badge: "NEW", live: true,
    desc: "Motion grafik engine Remotion: hook animasi → bullet reveal → CTA pulse, ilustrasi AI per poin, narasi TTS + caption karaoke, SFX sinkron, render MP4 30fps.",
    fields: [
      { key: "mode", label: "Mode", type: "select", default: "manual",
        options: [
          { value: "manual", label: "Manual — aku isi sendiri" },
          { value: "ai", label: "Otomatis AI — LLM susun hook/bullet/CTA dari topik" },
          { value: "berita", label: "Berita Otomatis — Google News → video (dijadwalkan harian)" },
        ], hint: "Mode AI & Berita pakai LLM z-ai — gratis" },
      { key: "topik", label: "Topik / rubrik (mode AI & Berita)", type: "text",
        placeholder: "mis. tips hemat belanja mahasiswa, atau rubrik: teknologi, olahraga…" },
      { key: "judul", label: "Judul / hook", type: "text",
        placeholder: "RAHASIA KONTEN VIRAL", hint: "mode Manual — di mode AI dibuatkan z-ai" },
      { key: "bullets", label: "Poin (1 per baris — bebas jumlah, makin banyak makin panjang)", type: "textarea",
        placeholder: "Hook 3 detik pertama\nGaya bicara santai\nCTA jelas di akhir" },
      { key: "cta", label: "CTA penutup", type: "text", placeholder: "FOLLOW SEKARANG" },
      { key: "hookdur", label: "Durasi hook (detik)", type: "number", default: "2.5", placeholder: "2.5" },
      { key: "bulletdur", label: "Durasi per poin (detik)", type: "number", default: "2", placeholder: "2",
        hint: "banyak poin × durasi ini = panjang tengah video" },
      { key: "ctadur", label: "Durasi CTA (detik)", type: "number", default: "3", placeholder: "3" },
      { key: "ilustrasi", label: "Ilustrasi AI per poin", type: "select", default: "ya",
        options: [
          { value: "ya", label: "Ya — latar tiap poin digambar AI sesuai topik" },
          { value: "tidak", label: "Tidak — gradien + ikon saja (lebih cepat)" },
        ], hint: "mode AI/Berita — +±15 detik per gambar saat render" },
      { key: "warna", label: "Warna tema", type: "select", default: "green",
        options: [
          { value: "green", label: "Hijau Neon" }, { value: "blue", label: "Biru Tech" },
          { value: "orange", label: "Oranye Panas" }, { value: "pink", label: "Pink Viral" },
        ] },
      { key: "sfx", label: "Audio SFX", type: "select", default: "ya",
        options: [
          { value: "ya", label: "Dengan SFX (whoosh + pop + ding)" },
          { value: "tidak", label: "Tanpa audio" },
        ] },
      { key: "narmode", label: "Narasi voice-over (Edge TTS)", type: "select", default: "tidak",
        options: [
          { value: "tidak", label: "Tanpa suara (hanya SFX)" },
          { value: "ya", label: "Dengan narasi — teks per bagian dari form/LLM" },
        ] },
      { key: "narasi", label: "Teks narasi (1 per baris: hook, tiap poin, CTA — kosongkan biar LLM isi)", type: "textarea",
        placeholder: "Tiga rahasia konten yang bikin orang berhenti scroll\nKonsisten posting di jam yang sama\n…" },
      { key: "voice", label: "Suara narasi", type: "select", default: "id-ID-ArdiNeural",
        options: [
          { value: "id-ID-ArdiNeural", label: "Ardi — Pria 🇮🇩" },
          { value: "id-ID-GadisNeural", label: "Gadis — Wanita 🇮🇩" },
        ] },
      { key: "vostyle", label: "Gaya voice-over", type: "select", default: "netral",
        options: [
          { value: "netral", label: "Netral — jelas & santai" },
          { value: "hype", label: "Hype — cepat & bersemangat" },
          { value: "mengejek", label: "Mengejek — sarkastik, nyebelin" },
        ] },
      { key: "simpanDrive", label: "Storage hasil", type: "select", default: "tidak",
        options: [
          { value: "tidak", label: "Simpan di server (download dari sini)" },
          { value: "ya", label: "Upload ke Google Drive juga (butuh VL_GDRIVE_* di deploy/env)" },
        ], hint: "Link share Drive muncul di panel hasil job" },
    ],
  },
  {
    id: "title-optimizer", name: "Optimasi Judul", icon: "📈", group: "SEO & Analitik", live: true,
    desc: "LLM menilai & memperbaiki judul video → skor CTR + alasan.",
    fields: [
      { key: "judul", label: "Judul sekarang", type: "text", required: true,
        placeholder: "vlog jalan2 ke pasar" },
      { key: "platform", label: "Platform", type: "select", default: "youtube",
        options: [
          { value: "youtube", label: "YouTube" }, { value: "tiktok", label: "TikTok" },
          { value: "reels", label: "IG Reels" },
        ] },
    ],
  },
  {
    id: "viral-tips", name: "Saran Viral AI", icon: "🔥", group: "SEO & Analitik", live: true,
    desc: "LLM memberi 5 ide konten + hook 3 detik pertama + CTA, khusus pasar Indonesia.",
    fields: [
      { key: "niche", label: "Niche akun", type: "text", required: true,
        placeholder: "kuliner street food Jakarta" },
    ],
  },
  {
    id: "auto-upload", name: "Auto Upload", icon: "📡", group: "Distribusi", badge: "PRO", live: false,
    desc: "Publish otomatis ke YouTube/TikTok/IG butuh OAuth akun platform masing-masing — belum di demo.",
    fields: [],
  },
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
