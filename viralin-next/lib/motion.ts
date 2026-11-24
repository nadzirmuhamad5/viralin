/** Modul bersama Motion Studio (Remotion) — dipakai client (Player preview)
 *  DAN server (bundler/renderer) TANPA import apa pun dari "remotion". */

export type WarnaId = "green" | "blue" | "orange" | "pink";

/** Arketipe animasi per-makna — tiap poin dapat scene visual sendiri.
 *  Makin spesifik arketipe, makin menggambarkan topik yang dibicarakan. */
export type AnimId =
  | "slide" | "money" | "phone" | "check" | "heart" | "fire"
  | "alert" | "clock" | "chat" | "rocket" | "counter"
  | "kuliner" | "bola" | "belajar" | "medis" | "musik"
  | "travel" | "cuaca" | "game" | "mega" | "target";

export const ANIM_IDS: AnimId[] = [
  "slide", "money", "phone", "check", "heart", "fire",
  "alert", "clock", "chat", "rocket", "counter",
  "kuliner", "bola", "belajar", "medis", "musik",
  "travel", "cuaca", "game", "mega", "target",
];

export const ANIM_LABEL: Record<AnimId, string> = {
  slide: "umum", money: "uang/hemat", phone: "HP/sosmed", check: "langkah/tips",
  heart: "cinta/suka", fire: "viral/panas", alert: "larangan/awas", clock: "waktu/cepat",
  chat: "obrolan/pendapat", rocket: "naik/sukses", counter: "angka/statistik",
  kuliner: "makanan/minuman", bola: "olahraga", belajar: "belajar/sekolah",
  medis: "kesehatan/sakit", musik: "musik/lagu", travel: "liburan/wisata",
  cuaca: "cuaca/musim", game: "game/esports", mega: "berita/pengumuman",
  target: "tujuan/mimpi",
};

export type MotionStudioProps = {
  judul: string;
  bullets: string; // satu poin per baris — bebas jumlah
  cta: string;
  warna: WarnaId;
  sfx: boolean;
  /** opsional — anim per poin (urut, satu baris satu AnimId).
   *  Diisi mode AI (LLM memilih); kosong → deteksi keyword otomatis. */
  anims?: string;
  /** opsional — durasi tiap bagian dalam DETIK (dari form). */
  hookdur?: string;
  bulletdur?: string;
  ctadur?: string;
  /** opsional — path ilustrasi latar per poin (relatif public/, mis. "motion/j-0.png").
   *  Diisi mode AI/Berita (gambar AI sesuai topik poin); kosong → latar gradien. */
  imgs?: string;
};

export const PALETTES: Record<WarnaId, { bg: string; bg2: string; accent: string; chip: string; label: string }> = {
  green:  { bg: "#052e16", bg2: "#022c22", accent: "#22c55e", chip: "#064e3b", label: "Hijau Neon" },
  blue:   { bg: "#0c192e", bg2: "#082f49", accent: "#3b82f6", chip: "#0c2d55", label: "Biru Tech" },
  orange: { bg: "#431407", bg2: "#451a03", accent: "#f97316", chip: "#5b2a10", label: "Oranye Panas" },
  pink:   { bg: "#500724", bg2: "#4a044e", accent: "#ec4899", chip: "#6b1044", label: "Pink Viral" },
};

export const MOTION_FPS = 30;

const durSec = (v: string | undefined, def: number, min: number, max: number) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= min && n <= max ? n : def;
};
export const motionHookFrames = (p: MotionStudioProps) => Math.round(durSec(p.hookdur, 2.5, 1, 10) * MOTION_FPS);
export const motionBulletFrames = (p: MotionStudioProps) => Math.round(durSec(p.bulletdur, 2, 0.5, 10) * MOTION_FPS);
export const motionCtaFrames = (p: MotionStudioProps) => Math.round(durSec(p.ctadur, 3, 1, 15) * MOTION_FPS);

export function motionBullets(p: MotionStudioProps): string[] {
  return p.bullets.split(/\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 12);
}

/** Deteksi makna dari teks (kata kunci Indonesia) → AnimId. Fallback mode Manual. */
export function detectAnim(text: string): AnimId {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((k) => t.includes(k));
  if (has("jangan", "awas", "hati-hati", "hindari", "kesalahan", "risiko", "bahaya", "berhenti", "stop", "gagal", "jebakan", "mematikan")) return "alert";
  if (has("kopi", "kuliner", "makan", "minum", "resep", "masak", "dapur", "cafe", "kafe", "roti", "nasi", "ayam", "sambal", "dessert", "jajanan", "minuman", "boba", "susu")) return "kuliner";
  if (has("uang", "hemat", "belanja", "harga", "murah", "gratis", "diskon", "promo", "bayar", "cicilan", "gajian", "profit", "untung", "rugi", "rp", "rupiah", "tabungan", "investasi", "cuan", "budget", "keuangan", "duit", "jual", "beli", "pajak", "cashback", "warung", "toko", "umkm")) return "money";
  if (has("viral", "trending", "panas", "hits", "fyp", "hype", "populer", "ramai", "meledak", "fenomena")) return "fire";
  if (has("cinta", "sayang", "suka", "hati", "bahagia", "damai", "lucu", "gebetan", "crush", "romantis")) return "heart";
  if (has("hp", "ponsel", "aplikasi", "tiktok", "instagram", "reels", "story", "upload", "posting", "follow", "swipe", "screenshot", "dm", "scroll", "online", "kamera", "foto", "video", "channel", "subscriber", "live", "edit")) return "phone";
  if (has("tanya", "jawab", "bicara", "ngomong", "bilang", "katakan", "komentar", "cerita", "jujur", "opini", "pendapat", "diskusi", "ngobrol", "curhat", "chat")) return "chat";
  if (has("naik", "sukses", "berkembang", "maju", "mahir", "kuasai", "upgrade", "karier", "prestasi", "juara", "boost", "produktif", "skill", "jago")) return "rocket";
  if (has("bola", "sepak", "futsal", "liga", "pertandingan", "gol", "tim", "skor", "piala", "olahraga", "lari", "balap", "atlet", "badminton", "volly")) return "bola";
  if (has("belajar", "sekolah", "kuliah", "ujian", "pelajaran", "buku", "membaca", "kursus", "tutorial", "bahasa", "tugas")) return "belajar";
  if (has("sehat", "kesehatan", "sakit", "dokter", "obat", "vitamin", "tidur", "stamina", "imun", "gigi", "rumah sakit", "vaksin", "mental", "stres")) return "medis";
  if (has("musik", "lagu", "konser", "band", "gitar", "piano", "dj", "beat", "album", "penyanyi", "dangdut", "playlist", "sound")) return "musik";
  if (has("liburan", "jalan-jalan", "wisata", "travel", "trip", "pantai", "gunung", "hotel", "tiket", "pesawat", "backpacker", "destinasi", "villa")) return "travel";
  if (has("hujan", "matahari", "awan", "badai", "musim", "dingin", "gerimis", "cuaca", "banjir")) return "cuaca";
  if (has("game", "gaming", "gamer", "esports", "konsol", "moba", "fps", "rank", "skin", "main game")) return "game";
  if (has("pengumuman", "bocor", "kabar", "isu", "heboh", "resmi", "dirilis", "rilis", "launching", "berita")) return "mega";
  if (has("tujuan", "target", "mimpi", "visi", "misi", "rencana", "resolusi", "fokus", "motivasi", "strategi")) return "target";
  if (has("cara", "tips", "trik", "langkah", "rutin", "kebiasaan", "lakukan", "pastikan", "ingat", "checklist", "persiapan", "harus", "wajib", "penting", "rahasia", "prinsip", "kunci", "moto")) return "check";
  if (has("cepat", "menit", "detik", "jam", "hari", "minggu", "bulanan", "bulan", "waktu", "deadline", "langsung", "instan", "kilat", "sekarang", "malam", "pagi")) return "clock";
  if (/\d/.test(t)) return "counter";
  return "slide";
}

/** Anim per poin: ikuti p.anims (dari LLM, divalidasi) → invalid/kosong pakai detectAnim. */
export function motionAnims(p: MotionStudioProps): AnimId[] {
  const raw = (p.anims || "").split(/\n+/).map((s) => s.trim().toLowerCase());
  return motionBullets(p).map((t, i) =>
    (ANIM_IDS.includes(raw[i] as AnimId) ? raw[i] : detectAnim(t)) as AnimId,
  );
}

/** Pasangan {teks, anim} untuk komposisi. */
export function motionScenes(p: MotionStudioProps): Array<{ t: string; a: AnimId }> {
  const bs = motionBullets(p);
  const as = motionAnims(p);
  return bs.map((t, i) => ({ t, a: as[i] }));
}

/** Path ilustrasi latar per poin (urut; "" = tanpa gambar). */
export function motionImgs(p: MotionStudioProps): string[] {
  const raw = (p.imgs || "").split(/\n+/).map((s) => s.trim());
  return motionBullets(p).map((_, i) => (raw[i] || "").startsWith("motion/") ? raw[i] : "");
}

/** Durasi total komposisi dalam frame (hook + n poin + CTA) — mengikuti durasi form. */
export function motionDurationFrames(p: MotionStudioProps): number {
  return motionHookFrames(p) + motionBullets(p).length * motionBulletFrames(p) + motionCtaFrames(p);
}

export const MOTION_CTA_START = (p: MotionStudioProps) =>
  motionHookFrames(p) + motionBullets(p).length * motionBulletFrames(p);

export function motionDefaultProps(): MotionStudioProps {
  return {
    judul: "RAHASIA KONTEN VIRAL",
    bullets: "Hook 3 detik pertama\nGaya bicara santai\nCTA jelas di akhir",
    cta: "FOLLOW SEKARANG",
    warna: "green",
    sfx: true,
    hookdur: "2.5",
    bulletdur: "2",
    ctadur: "3",
  };
}
