/** Modul bersama Motion Studio (Remotion) — dipakai client (Player preview)
 *  DAN server (bundler/renderer) TANPA import apa pun dari "remotion". */

export type WarnaId = "green" | "blue" | "orange" | "pink";

export type MotionStudioProps = {
  judul: string;
  bullets: string; // satu bullet per baris, maks 5
  cta: string;
  warna: WarnaId;
  sfx: boolean;
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
