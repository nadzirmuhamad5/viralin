/** Konsep VIRAL Content Creator v2 — "fast-hook": visual berlapis ala TikTok/Reels.
 *  Dipakai bersama: renderer server (toolrun) DAN komposisi Remotion (ViralKonten).
 *  Struktur naskah: hook (pattern-interrupt ≤3s) → poin-poin (bg ganti per poin,
 *  Ken Burns + karaoke caption) → CTA end-card. Word-timing whisper dipakai
 *  untuk menentukan batas scene secara presisi (bukan tebak per detik). */

export type ViralSceneKind = "hook" | "poin" | "cta";

export type ViralScene = {
  kind: ViralSceneKind;
  text: string;
  img: string; // URL absolut utk renderer (/api/asset/...) atau path relatif utk Player
  start: number; // detik
  end: number; // detik
};

export type ViralKontenProps = {
  fps: number;
  scenes: ViralScene[];
  words: { w: string; s: number; e: number }[]; // detik, dari whisper
  highlight: string; // warna kata aktif karaoke
};

export const VIRAL_FPS = 30;
export const VIRAL_HIGHLIGHT = "#FFD400";

export const viralDurationFrames = (p: ViralKontenProps): number =>
  Math.max(30, Math.ceil((p.scenes.length ? p.scenes[p.scenes.length - 1].end : 5) * (p.fps || VIRAL_FPS)));

export const viralDefaultProps = (): ViralKontenProps => ({
  fps: VIRAL_FPS,
  scenes: [{ kind: "hook", text: "HOOK CONTOH", img: "", start: 0, end: 3 }],
  words: [],
  highlight: VIRAL_HIGHLIGHT,
});

/** Pecah teks jadi kata bersih (untuk hitung & align). */
const kata = (t: string): string[] =>
  (t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean));

/** Align batas scene ke timeline whisper: tiap segmen teks dikonsumsi proporsional
 *  jumlah kata, lalu di-SNAP ke kata persis yang sama di hasil whisper (±6 kata)
 *  — estimasi proporsional di-SNAP ke AKHIR SEGMENT whisper (akhir kalimat; tiap
 *  segmen teks = 1 kalimat) terdekat — jauh lebih stabil daripada snap kata,
 *  karena kata yang sama bisa muncul 2× di naskah dan menyentak boundary. */
export function alignScenes(
  texts: string[],
  words: { word: string; end: number }[],
  totalDur: number,
  whisperSegEnds: number[] = [], // end time tiap segment whisper (akhir kalimat)
): { start: number; end: number }[] {
  const segs = texts.map(kata).filter((k) => k.length > 0);
  const counts = segs.map((k) => k.length);
  const totalKata = counts.reduce((a, b) => a + b, 0) || 1;
  const W = words.length;
  if (!W) {
    // tanpa whisper → bagi proporsional durasi
    let acc = 0;
    return counts.map((c) => {
      const st = (acc / totalKata) * totalDur;
      acc += c;
      return { start: st, end: (acc / totalKata) * totalDur };
    });
  }
  const ends: number[] = [];
  let cum = 0;
  for (let i = 0; i < counts.length; i++) {
    cum += counts[i];
    // estimasi waktu dari distribusi kata → snap ke akhir kalimat whisper terdekat
    const idx = Math.min(W - 1, Math.max(0, Math.round((cum / totalKata) * W) - 1));
    let end = words[idx].end;
    let best = Infinity;
    for (const se of whisperSegEnds) {
      const d = Math.abs(se - end);
      if (d < best && d <= 2.5) { best = d; end = se; }
    }
    ends.push(end);
  }
  // clamp monotonic + jeda minimal antar scene
  const out: { start: number; end: number }[] = [];
  let prev = 0;
  for (let i = 0; i < ends.length; i++) {
    const end = Math.max(prev + 0.4, Math.min(ends[i], totalDur));
    out.push({ start: prev, end });
    prev = end;
  }
  out[out.length - 1].end = Math.max(prev, totalDur); // scene terakhir isi sisa durasi
  return out;
}
