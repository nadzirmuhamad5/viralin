/** Modul bersama Motion Studio (Remotion) — dipakai client (Player preview)
 *  DAN server (bundler/renderer) TANPA import apa pun dari "remotion". */

export type WarnaId = "green" | "blue" | "orange" | "pink";

/** Arketipe animasi per-makna — tiap bullet dapat scene visual sendiri. */
export type AnimId =
  | "slide" | "money" | "phone" | "check" | "heart" | "fire"
  | "alert" | "clock" | "chat" | "rocket" | "counter";

export const ANIM_IDS: AnimId[] = [
  "slide", "money", "phone", "check", "heart", "fire",
  "alert", "clock", "chat", "rocket", "counter",
];

export const ANIM_LABEL: Record<AnimId, string> = {
  slide: "umum", money: "uang/hemat", phone: "HP/sosmed", check: "langkah/tips",
  heart: "cinta/suka", fire: "viral/panas", alert: "larangan/awas", clock: "waktu/cepat",
  chat: "obrolan/pendapat", rocket: "naik/sukses", counter: "angka/statistik",
};

export type MotionStudioProps = {
  judul: string;
  bullets: string; // satu bullet per baris, maks 5
  cta: string;
  warna: WarnaId;
  sfx: boolean;
  /** opsional — anim per bullet (urut, satu baris satu AnimId).
   *  Diisi mode AI (LLM memilih); kosong → deteksi keyword otomatis. */
  anims?: string;
};

export const PALETTES: Record<WarnaId, { bg: string; bg2: string; accent: string; chip: string; label: string }> = {
  green:  { bg: "#052e16", bg2: "#022c22", accent: "#22c55e", chip: "#064e3b", label: "Hijau Neon" },
  blue:   { bg: "#0c192e", bg2: "#082f49", accent: "#3b82f6", chip: "#0c2d55", label: "Biru Tech" },
  orange: { bg: "#431407", bg2: "#451a03", accent: "#f97316", chip: "#5b2a10", label: "Oranye Panas" },
  pink:   { bg: "#500724", bg2: "#4a044e", accent: "#ec4899", chip: "#6b1044", label: "Pink Viral" },
};

export const MOTION_FPS = 30;
const HOOK_FRAMES = 75;  // 2.5s
const BULLET_FRAMES = 60; // 2s per bullet
const CTA_FRAMES = 90;   // 3s

export function motionBullets(p: MotionStudioProps): string[] {
  return p.bullets.split(/\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
}

/** Deteksi makna dari teks (kata kunci Indonesia) → AnimId. Fallback mode Manual. */
export function detectAnim(text: string): AnimId {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((k) => t.includes(k));
  if (has("jangan", "awas", "hati-hati", "hindari", "kesalahan", "risiko", "bahaya", "berhenti", "stop", "gagal", "jebakan", "mematikan")) return "alert";
  if (has("uang", "hemat", "belanja", "harga", "murah", "gratis", "diskon", "promo", "bayar", "cicilan", "gajian", "profit", "untung", "rugi", "rp", "rupiah", "tabungan", "investasi", "cuan", "budget", "keuangan", "duit", "jual", "beli", "pajak", "cashback", "warung", "toko", "umkm")) return "money";
  if (has("viral", "trending", "panas", "hits", "fyp", "hype", "populer", "ramai", "meledak", "fenomena")) return "fire";
  if (has("cinta", "sayang", "suka", "hati", "bahagia", "damai", "lucu", "gebetan", "crush", "romantis")) return "heart";
  if (has("hp", "ponsel", "aplikasi", "tiktok", "instagram", "reels", "story", "upload", "posting", "follow", "swipe", "screenshot", "dm", "scroll", "online", "kamera", "foto", "video", "channel", "subscriber", "live", "edit")) return "phone";
  if (has("tanya", "jawab", "bicara", "ngomong", "bilang", "katakan", "komentar", "cerita", "jujur", "opini", "pendapat", "diskusi", "ngobrol", "curhat", "chat")) return "chat";
  if (has("naik", "sukses", "berkembang", "maju", "mahir", "kuasai", "upgrade", "level", "karier", "prestasi", "juara", "boost", "produktif", "skill", "jago")) return "rocket";
  if (has("cara", "tips", "trik", "langkah", "resep", "rutin", "kebiasaan", "lakukan", "pastikan", "ingat", "checklist", "persiapan", "harus", "wajib", "penting", "rahasia", "prinsip", "kunci", "moto")) return "check";
  if (has("cepat", "menit", "detik", "jam", "hari", "minggu", "bulanan", "bulan", "waktu", "deadline", "langsung", "instan", "kilat", "sekarang", "malam", "pagi")) return "clock";
  if (/\d/.test(t)) return "counter";
  return "slide";
}

/** Anim per bullet: ikuti p.anims (dari LLM, divalidasi) → invalid/kosong pakai detectAnim. */
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

/** Durasi total komposisi dalam frame (hook + n bullet + CTA). */
export function motionDurationFrames(p: MotionStudioProps): number {
  return HOOK_FRAMES + motionBullets(p).length * BULLET_FRAMES + CTA_FRAMES;
}

export const MOTION_BULLET_START = HOOK_FRAMES;
export const MOTION_BULLET_LEN = BULLET_FRAMES;
export const MOTION_CTA_START = (p: MotionStudioProps) => HOOK_FRAMES + motionBullets(p).length * BULLET_FRAMES;

export function motionDefaultProps(): MotionStudioProps {
  return {
    judul: "RAHASIA KONTEN VIRAL",
    bullets: "Hook 3 detik pertama\nGaya bicara santai\nCTA jelas di akhir",
    cta: "FOLLOW SEKARANG",
    warna: "green",
    sfx: true,
  };
}
