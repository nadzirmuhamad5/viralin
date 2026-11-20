/** Caption karaoke ala klipers.pro — ASS word-level (\\k), dibakar ffmpeg + fontsdir.
 *  30 preset: font, warna highlight, outline, animasi pop — spec diambil dari klipers.pro. */

export type Word = { word: string; start: number; end: number; probability?: number };

export type CaptionPreset = {
  id: string;
  name: string;
  group: string;
  /** nama file di assets/caption-fonts ("" = font sistem) */
  fontFile: string;
  /** nama family ASS yang harus cocok dgn font file */
  fontFamily: string;
  fontSize: number;
  /** warna kata yang sudah "dinyanyikan" (css hex) */
  highlightColor: string;
  /** warna teks dasar / kata berikutnya */
  primaryColor: string;
  outlineColor: string;
  outline: number;
  uppercase: boolean;
  anim: "pop" | "wave" | "none";
  /** margin bawah (PlayResY 960) */
  marginV: number;
  /** kata per baris */
  maxWords: number;
  /** BorderStyle 3 = kotak solid */
  box?: boolean;
};

export const DEFAULT_PRESET = "bold-impact";

const ANTON = { fontFile: "Anton-Regular.ttf", fontFamily: "Anton" };
const BEBAS = { fontFile: "BebasNeue-Regular.ttf", fontFamily: "Bebas Neue" };
const ARCHIVO = { fontFile: "ArchivoBlack-Regular.ttf", fontFamily: "Archivo Black" };
const MONTS_XB = { fontFile: "Montserrat-ExtraBold.ttf", fontFamily: "Montserrat ExtraBold" };
const SYS = { fontFile: "", fontFamily: "DejaVu Sans" };

function P(p: Partial<CaptionPreset> & { id: string; name: string; group: string; highlightColor: string }): CaptionPreset {
  return {
    fontFile: ANTON.fontFile, fontFamily: ANTON.fontFamily, fontSize: 58,
    primaryColor: "#FFFFFF", outlineColor: "#000000", outline: 4,
    uppercase: true, anim: "pop", marginV: 120, maxWords: 4,
    ...p,
  } as CaptionPreset;
}

export const PRESETS: Record<string, CaptionPreset> = Object.fromEntries(
  [
    P({ id: "bold-impact", name: "Bold Impact", group: "Hormozi", highlightColor: "#FFD400", fontSize: 62, outline: 5, maxWords: 4 }),
    P({ id: "street-pop", name: "Street Pop", group: "Street", ...ARCHIVO, highlightColor: "#22C55E", fontSize: 56, maxWords: 3 }),
    P({ id: "outline-clean", name: "Outline Clean", group: "Outline", ...BEBAS, highlightColor: "#FFFFFF", fontSize: 64 }),
    P({ id: "karaoke-classic", name: "Karaoke Classic", group: "Karaoke", highlightColor: "#FF3B30", fontSize: 58, anim: "wave", maxWords: 5 }),
    P({ id: "minimal-mono", name: "Minimal Mono", group: "Minimal", ...SYS, highlightColor: "#FFFFFF", fontSize: 40, outline: 3, uppercase: false, anim: "none", marginV: 100, maxWords: 5, box: true }),
    P({ id: "neon-purple", name: "Neon Purple", group: "Neon", ...MONTS_XB, highlightColor: "#A855F7", fontSize: 54, outlineColor: "#1E1B4B", uppercase: false }),
    P({ id: "tiktok-hot", name: "TikTok Hot", group: "TikTok", highlightColor: "#FE2C55", fontSize: 60, outline: 5 }),
    P({ id: "gold-lux", name: "Gold Lux", group: "Luxe", ...BEBAS, highlightColor: "#FFC93C", fontSize: 62 }),
    P({ id: "ice-blue", name: "Ice Blue", group: "Karaoke", ...MONTS_XB, highlightColor: "#38BDF8", fontSize: 52, outlineColor: "#0C4A6E", uppercase: false, anim: "wave" }),
    P({ id: "sunset-orange", name: "Sunset Orange", group: "Street", ...ARCHIVO, highlightColor: "#F97316", fontSize: 54 }),
    P({ id: "mint-fresh", name: "Mint Fresh", group: "Minimal", ...SYS, highlightColor: "#34D399", fontSize: 42, outlineColor: "#064E3B", uppercase: false, anim: "none" }),
    P({ id: "crimson-bold", name: "Crimson Bold", group: "Hormozi", highlightColor: "#EF4444", fontSize: 62, outline: 5 }),
    P({ id: "ocean-deep", name: "Ocean Deep", group: "Neon", ...MONTS_XB, highlightColor: "#0EA5E9", primaryColor: "#E0F2FE", outlineColor: "#082F49", fontSize: 52, uppercase: false, anim: "none" }),
    P({ id: "forest-green", name: "Forest Green", group: "Street", ...BEBAS, highlightColor: "#16A34A", fontSize: 60, outlineColor: "#052E16", anim: "none" }),
    P({ id: "lavender-pop", name: "Lavender Pop", group: "TikTok", ...MONTS_XB, highlightColor: "#C084FC", fontSize: 50, outlineColor: "#2E1065", uppercase: false }),
    P({ id: "cyber-yellow", name: "Cyber Yellow", group: "Neon", ...ARCHIVO, highlightColor: "#FACC15", fontSize: 54, anim: "wave" }),
    P({ id: "retro-orange", name: "Retro Orange", group: "Luxe", ...BEBAS, highlightColor: "#FB923C", primaryColor: "#FFF8EC", outlineColor: "#431407", fontSize: 62, anim: "none" }),
    P({ id: "blackout", name: "Blackout", group: "Minimal", highlightColor: "#FFFFFF", fontSize: 56, outline: 0, box: true, marginV: 140, anim: "none" }),
    P({ id: "highlighter-blue", name: "Highlighter Blue", group: "TikTok", ...MONTS_XB, highlightColor: "#2563EB", fontSize: 50, outline: 3, uppercase: false }),
    P({ id: "cotton-candy", name: "Cotton Candy", group: "Minimal", ...SYS, highlightColor: "#F472B6", fontSize: 42, outlineColor: "#500724", uppercase: false, anim: "none" }),
    P({ id: "volcano-red", name: "Volcano Red", group: "Hormozi", ...ARCHIVO, highlightColor: "#DC2626", fontSize: 58, outline: 5 }),
    P({ id: "midnight-glow", name: "Midnight Glow", group: "Neon", highlightColor: "#818CF8", primaryColor: "#E0E7FF", outlineColor: "#0F172A", fontSize: 58, anim: "wave" }),
    P({ id: "pastel-dream", name: "Pastel Dream", group: "Minimal", ...MONTS_XB, highlightColor: "#F9A8D4", fontSize: 46, outlineColor: "#831843", outline: 2, uppercase: false, anim: "none" }),
    P({ id: "thunder-bold", name: "Thunder Bold", group: "Street", highlightColor: "#FDE047", fontSize: 64, outline: 6, marginV: 110, maxWords: 3 }),
    P({ id: "bubblegum", name: "Bubblegum", group: "TikTok", ...BEBAS, highlightColor: "#EC4899", fontSize: 58 }),
    P({ id: "steel-gray", name: "Steel Gray", group: "Outline", ...ARCHIVO, highlightColor: "#E5E7EB", primaryColor: "#E5E7EB", outlineColor: "#111111", fontSize: 52, anim: "none" }),
    P({ id: "royal-purple", name: "Royal Purple", group: "Luxe", ...MONTS_XB, highlightColor: "#7C3AED", outlineColor: "#1E1B4B", fontSize: 52, anim: "none" }),
    P({ id: "emerald-wave", name: "Emerald Wave", group: "Karaoke", ...BEBAS, highlightColor: "#10B981", fontSize: 60, anim: "wave" }),
    P({ id: "molten-lava", name: "Molten Lava", group: "Hormozi", ...BEBAS, highlightColor: "#F97316", fontSize: 62, outline: 5, anim: "wave" }),
    P({ id: "arctic-frost", name: "Arctic Frost", group: "Outline", ...MONTS_XB, highlightColor: "#E0F2FE", outlineColor: "#0C4A6E", fontSize: 52, uppercase: false, anim: "none" }),
  ].map((p) => [p.id, p])
);

/* ── util ─────────────────────────────────────────────────────────────── */

function hexToAss(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "&H00FFFFFF&";
  const n = parseInt(m[1], 16);
  const b = n & 255, g = (n >> 8) & 255, r = (n >> 16) & 255;
  return `&H00${b.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${r
    .toString(16)
    .padStart(2, "0")}&`.toUpperCase();
}

function ts(t: number): string {
  const cs = Math.max(0, Math.round(t * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}

const esc = (s: string) => s.replace(/[{}\\]/g, "").trim();

type Line = { words: Word[] };

/** Kelompokkan kata jadi baris caption: maks N kata, maks ~3.6s, pecah di jeda > 0.7s. */
function groupLines(words: Word[], maxWords: number): Line[] {
  const lines: Line[] = [];
  let cur: Word[] = [];
  let curStart = 0;
  for (const w of words) {
    const gap = cur.length ? w.start - cur[cur.length - 1].end : 0;
    const dur = cur.length ? w.end - curStart : 0;
    if (cur.length && (cur.length >= maxWords || gap > 0.7 || dur > 3.6)) {
      lines.push({ words: cur });
      cur = [];
    }
    if (!cur.length) curStart = w.start;
    cur.push(w);
  }
  if (cur.length) lines.push({ words: cur });
  return lines;
}

/* ── builder utama ────────────────────────────────────────────────────── */

export function buildAss(
  words: Word[],
  opts: { presetId?: string; clipStart?: number; clipEnd?: number; positionY?: number } = {}
): string {
  const preset = PRESETS[opts.presetId || DEFAULT_PRESET] || PRESETS[DEFAULT_PRESET];
  const c0 = opts.clipStart ?? 0;
  const c1 = opts.clipEnd ?? Number.MAX_SAFE_INTEGER;
  const mv = opts.positionY ?? preset.marginV;

  const inWindow = words
    .filter((w) => w.end > c0 + 0.01 && w.start < c1 && w.word?.trim())
    .sort((a, b) => a.start - b.start)
    .map((w) => ({
      ...w,
      // geser ke timeline klip (relatif 0)
      start: Math.max(0, w.start - c0),
      end: Math.max(0.08, Math.min(w.end - c0, c1 - c0)),
    }))
    .filter((w) => w.end > w.start);

  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 540",
    "PlayResY: 960",
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
    `Style: Cap,${preset.fontFamily},${preset.fontSize},${hexToAss(preset.highlightColor)},${hexToAss(
      preset.primaryColor
    )},${hexToAss(preset.outlineColor)},&H64000000,-1,0,0,0,100,100,0,0,${
      preset.box ? 3 : 1
    },${preset.outline},0,2,36,36,${Math.round(mv)},1`,
    "",
    "[Events]",
    "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
  ];

  const events: string[] = [];
  for (const line of groupLines(inWindow, preset.maxWords)) {
    const first = line.words[0];
    const last = line.words[line.words.length - 1];
    const start = Math.max(0, first.start - 0.03);
    const end = last.end + 0.15;
    // animasi baris
    const pre =
      preset.anim === "pop"
        ? "{\\t(0,110,\\fscx108\\fscy108)\\t(110,210,\\fscx100\\fscy100)}"
        : preset.anim === "wave"
          ? "{\\fad(90,0)}"
          : "";
    // karaoke: \k per kata (centiseconds); jeda antar-kata dilekatkan ke kata sebelumnya
    const parts: string[] = [];
    let cursor = first.start;
    for (const w of line.words) {
      const gapCs = Math.max(0, Math.round((w.start - cursor) * 100));
      let k = Math.max(8, Math.round((w.end - w.start) * 100));
      if (gapCs > 0) k += gapCs;
      cursor = w.start + k / 100;
      const text = preset.uppercase ? w.word.toUpperCase() : w.word;
      parts.push(`{\\k${k}}${esc(text)}`);
    }
    events.push(
      `Dialogue: 0,${ts(start)},${ts(end)},Cap,,0,0,0,,${pre}${parts.join(" ")}`
    );
  }

  return header.join("\n") + "\n" + events.join("\n") + "\n";
}
