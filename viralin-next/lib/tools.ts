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
  placeholder: "http://127.0.0.1:8080/e2e-ujian.mp4 atau URL YouTube/TikTok",
  required: true,
  hint: "YouTube kena bot-check? Paste isi cookies.txt di bagian Cookies di bawah (lihat panduannya).",
};

export const TOOLS: ToolDef[] = [
  {
    id: "klip-ai", name: "Analisis AI", icon: "🤖", group: "Kliping AI", badge: "GRATIS", live: true,
    desc: "URL video → AI pilih momen viral → klip 9:16 + caption karaoke 30 preset klipers.",
    fields: [SOURCE_FIELD],
  },
  {
    id: "atur-manual", name: "Atur Manual", icon: "✂️", group: "Kliping AI", live: true,
    desc: "Potong segmen persis mulai–selesai pilihanmu, tetap dengan caption gaya klipers.",
    fields: [
      SOURCE_FIELD,
      { key: "start", label: "Mulai (detik)", type: "number", required: true, placeholder: "10" },
      { key: "end", label: "Selesai (detik)", type: "number", required: true, placeholder: "40" },
      { key: "preset", label: "Gaya caption", type: "select", default: "bold-impact",
        options: [], hint: "Diisi otomatis dari picker preset." },
    ],
  },
  {
    id: "highlight-bola", name: "Highlight Bola", icon: "⚽", group: "Kliping AI", badge: "NEW", live: true,
    desc: "Deteksi ledakan energi audio (sorak stadion) → klip highlight 16:9 + scoreboard opsional.",
    fields: [
      SOURCE_FIELD,
      { key: "count", label: "Jumlah highlight", type: "number", default: "3" },
      { key: "seglen", label: "Durasi per klip (detik)", type: "number", default: "12" },
      { key: "scoreboard", label: "Scoreboard (opsional)", type: "text", placeholder: "Persija 2 - 1 Persib" },
    ],
  },
  {
    id: "transcript", name: "Transcript AI", icon: "📝", group: "Kliping AI", badge: "GRATIS", live: true,
    desc: "Ekstrak teks video → unduh SRT / VTT / TXT siap pakai.",
    fields: [SOURCE_FIELD],
  },
  {
    id: "split-cam", name: "Split Cam", icon: "🪟", group: "Kliping AI", badge: "PRO", live: false,
    desc: "Pisah facecam & gameplay/podcast otomatis. Butuh model CV ber-GPU — belum di demo gratis ini.",
    fields: [SOURCE_FIELD],
  },
  {
    id: "merge-video", name: "Merge Video", icon: "🎬", group: "Editor & Komposisi", badge: "NEW", live: true,
    desc: "Gabung beberapa video jadi satu (maks 4 sumber), auto-skala 9:16 + fade.",
    fields: [
      { key: "sources", label: "Daftar URL (satu per baris, maks 4)", type: "textarea", required: true,
        placeholder: "http://127.0.0.1:8080/e2e-ujian.mp4\nhttp://127.0.0.1:8080/e2e-ujian.mp4" },
      { key: "perdur", label: "Durasi per video (detik)", type: "number", default: "15" },
    ],
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
    id: "wa-story-hd", name: "WA Story HD", icon: "📱", group: "Editor & Komposisi", badge: "NEW", live: true,
    desc: "Konversi ke 720×1280 HD + audio loudnorm — siap story WhatsApp/TikTok.",
    fields: [
      SOURCE_FIELD,
      { key: "start", label: "Mulai (detik, kosong = awal)", type: "number" },
      { key: "dur", label: "Durasi (detik, kosong = semua)", type: "number" },
    ],
  },
  {
    id: "brand-kit", name: "Brand Kit", icon: "🏷️", group: "Editor & Komposisi", badge: "NEW", live: true,
    desc: "Bakar logo/watermark dengan posisi, ukuran & opasitas atur sendiri.",
    fields: [
      SOURCE_FIELD,
      { key: "logo", label: "URL logo (PNG transparan)", type: "url", required: true,
        placeholder: "https://…/logo.png" },
      { key: "position", label: "Posisi", type: "select", default: "tr",
        options: [
          { value: "tl", label: "Kiri Atas" }, { value: "tr", label: "Kanan Atas" },
          { value: "bl", label: "Kiri Bawah" }, { value: "br", label: "Kanan Bawah" },
        ] },
      { key: "opacity", label: "Opasitas (%)", type: "number", default: "80" },
      { key: "scale", label: "Ukuran (% lebar)", type: "number", default: "18" },
    ],
  },
  {
    id: "motion-graphic", name: "Motion Graphic", icon: "✨", group: "Editor & Komposisi", badge: "NEW", live: true,
    desc: "Kartu intro 5 detik: judul animasi slide-up + subjudul, background gradient.",
    fields: [
      { key: "judul", label: "Judul", type: "text", required: true, placeholder: "KANAL RAHASIA" },
      { key: "subjudul", label: "Subjudul", type: "text", placeholder: "Episode 12 — Kopi Susu Viral" },
      { key: "warna", label: "Warna tema", type: "select", default: "green",
        options: [
          { value: "green", label: "Hijau Neon" }, { value: "blue", label: "Biru Tech" },
          { value: "orange", label: "Oranye Panas" }, { value: "pink", label: "Pink Viral" },
        ] },
    ],
  },
  {
    id: "motion-studio", name: "Motion Studio", icon: "🎬", group: "Editor & Komposisi", badge: "NEW", live: true,
    desc: "Motion grafik engine Remotion: preview live di browser, hook animasi → bullet reveal → CTA pulse, SFX sinkron, render MP4 30fps.",
    fields: [
      { key: "judul", label: "Judul / hook", type: "text", required: true, placeholder: "RAHASIA KONTEN VIRAL" },
      { key: "bullets", label: "Bullet (1 per baris, maks 5)", type: "textarea",
        placeholder: "Hook 3 detik pertama\nGaya bicara santai\nCTA jelas di akhir" },
      { key: "cta", label: "CTA penutup", type: "text", placeholder: "FOLLOW SEKARANG" },
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
    ],
  },
  {
    id: "konten-tempel", name: "VIRAL Content Creator", icon: "🚀", group: "AI Generatif", badge: "VIRAL", live: true,
    desc: "Satu ide → naskah LLM → suara TTS → background AI → video vertikal ber-caption. Faceless, gratis.",
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
        ] },
      { key: "preset", label: "Gaya caption", type: "select", default: "bold-impact",
        options: [], hint: "Diisi otomatis dari picker preset." },
    ],
  },
  {
    id: "ai-image", name: "Klipers AI", icon: "🎨", group: "AI Generatif", badge: "NEW", live: true,
    desc: "Generator gambar AI gratis (pakai z-ai) — thumbnail, background, aset konten.",
    fields: [
      { key: "prompt", label: "Prompt gambar", type: "textarea", required: true,
        placeholder: "Thumbnail YouTube: kopi susu gula aren, gaya fotografi makanan, dramatis" },
      { key: "size", label: "Ukuran", type: "select", default: "1024x1024",
        options: [
          { value: "1024x1024", label: "1:1 — 1024×1024" },
          { value: "720x1440", label: "9:16 — 720×1440" },
          { value: "1344x768", label: "16:9 — 1344×768" },
          { value: "768x1344", label: "9:16 alt — 768×1344" },
        ] },
    ],
  },
  {
    id: "prompt-gen", name: "Generate Prompt", icon: "💡", group: "AI Generatif", live: true,
    desc: "Ide → prompt pro untuk AI image/video (struktur, gaya, negatif).",
    fields: [
      { key: "ide", label: "Ide mentah", type: "textarea", required: true,
        placeholder: "video produk kopi kekinian" },
      { key: "target", label: "Untuk", type: "select", default: "video",
        options: [
          { value: "video", label: "AI Video" }, { value: "image", label: "AI Image" },
        ] },
    ],
  },
  {
    id: "music-gen", name: "Music Generator", icon: "🎵", group: "AI Generatif", live: true,
    desc: "Background track prosedural (bukan AI sunggingan Suno): loop chord per mood, royalty-free.",
    fields: [
      { key: "mood", label: "Mood", type: "select", default: "lofi",
        options: [
          { value: "lofi", label: "Lo-fi Chill" }, { value: "epic", label: "Epic" },
          { value: "upbeat", label: "Upbeat" }, { value: "dark", label: "Dark Tense" },
        ] },
      { key: "dur", label: "Durasi (detik)", type: "number", default: "30" },
    ],
  },
  {
    id: "dubbing", name: "Voice Dubbing", icon: "🗣️", group: "AI Generatif", badge: "NEW", live: true,
    desc: "Ganti suara video: transkrip whisper → disuarakan ulang edge-tts, timing disinkronkan.",
    fields: [
      SOURCE_FIELD,
      { key: "voice", label: "Suara baru", type: "select", default: "id-ID-GadisNeural",
        options: [
          { value: "id-ID-GadisNeural", label: "Gadis — Wanita 🇮🇩" },
          { value: "id-ID-ArdiNeural", label: "Ardi — Pria 🇮🇩" },
        ] },
      { key: "dur", label: "Maks durasi proses (detik)", type: "number", default: "45" },
    ],
  },
  {
    id: "voice-clone", name: "Clone Suara", icon: "🧬", group: "AI Generatif", badge: "PRO", live: false,
    desc: "Kloning suara asli butuh model training (ElevenLabs berbayar) — belum di demo gratis ini.",
    fields: [SOURCE_FIELD],
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
    id: "thumbnail", name: "Download Thumbnail", icon: "🖼️", group: "SEO & Analitik", live: true,
    desc: "Ambil semua resolusi thumbnail video YouTube/TikTok via yt-dlp.",
    fields: [SOURCE_FIELD],
  },
  {
    id: "auto-upload", name: "Auto Upload", icon: "📡", group: "Distribusi", badge: "PRO", live: false,
    desc: "Publish otomatis ke YouTube/TikTok/IG butuh OAuth akun platform masing-masing — belum di demo.",
    fields: [],
  },
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
