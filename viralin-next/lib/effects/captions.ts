/**
 * Viralin caption presets — ported 1:1 from nadzirmuhamad5/viralin (viralin-next/lib/captions.ts).
 * The original repo burns ASS word-level karaoke captions (\k) into 9:16 clips with ffmpeg.
 * Here every preset is rebuilt as pure CSS: word-by-word highlight + pop/wave animation,
 * infinite loop, zero JavaScript.
 */
import type { CssEffect } from "./types";

export type CaptionAnim = "pop" | "wave" | "none";
export type CaptionFontId = "anton" | "bebas" | "archivo" | "montserrat" | "system";

export type CaptionPresetSpec = {
  id: string;
  name: string;
  group: string;
  font: CaptionFontId;
  /** ASS PlayResY = 960 units */
  fontSize: number;
  /** color of words already "sung" */
  highlightColor: string;
  /** base text color / next word */
  primaryColor: string;
  outlineColor: string;
  outline: number;
  uppercase: boolean;
  anim: CaptionAnim;
  /** words per line */
  maxWords: number;
  /** ASS BorderStyle 3 = solid box behind the line */
  box?: boolean;
};

const FONT_META: Record<CaptionFontId, { stack: string; weight?: number; google?: string }> = {
  anton: { stack: '"Anton", Impact, "Arial Narrow", sans-serif', google: "Anton" },
  bebas: { stack: '"Bebas Neue", Impact, sans-serif', google: "Bebas+Neue" },
  archivo: { stack: '"Archivo Black", "Arial Black", sans-serif', google: "Archivo+Black" },
  montserrat: { stack: '"Montserrat", Verdana, sans-serif', weight: 800, google: "Montserrat:wght@800" },
  system: { stack: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', weight: 700 },
};

const DEFAULTS = {
  font: "anton" as CaptionFontId,
  fontSize: 58,
  primaryColor: "#FFFFFF",
  outlineColor: "#000000",
  outline: 4,
  uppercase: true,
  anim: "pop" as CaptionAnim,
  maxWords: 4,
};

function P(
  p: Partial<CaptionPresetSpec> & { id: string; name: string; group: string; highlightColor: string }
): CaptionPresetSpec {
  return { ...DEFAULTS, ...p };
}

/** The 30 presets of viralin lib/captions.ts, same ids / colors / groups. */
export const CAPTION_PRESETS: CaptionPresetSpec[] = [
  P({ id: "bold-impact", name: "Bold Impact", group: "Hormozi", highlightColor: "#FFD400", fontSize: 62, outline: 5, maxWords: 4 }),
  P({ id: "street-pop", name: "Street Pop", group: "Street", font: "archivo", highlightColor: "#22C55E", fontSize: 56, maxWords: 3 }),
  P({ id: "outline-clean", name: "Outline Clean", group: "Outline", font: "bebas", highlightColor: "#FFFFFF", fontSize: 64 }),
  P({ id: "karaoke-classic", name: "Karaoke Classic", group: "Karaoke", highlightColor: "#FF3B30", fontSize: 58, anim: "wave", maxWords: 5 }),
  P({ id: "minimal-mono", name: "Minimal Mono", group: "Minimal", font: "system", highlightColor: "#FFFFFF", fontSize: 40, outline: 3, uppercase: false, anim: "none", maxWords: 5, box: true }),
  P({ id: "neon-purple", name: "Neon Purple", group: "Neon", font: "montserrat", highlightColor: "#A855F7", fontSize: 54, outlineColor: "#1E1B4B", uppercase: false }),
  P({ id: "tiktok-hot", name: "TikTok Hot", group: "TikTok", highlightColor: "#FE2C55", fontSize: 60, outline: 5 }),
  P({ id: "gold-lux", name: "Gold Lux", group: "Luxe", font: "bebas", highlightColor: "#FFC93C", fontSize: 62 }),
  P({ id: "ice-blue", name: "Ice Blue", group: "Karaoke", font: "montserrat", highlightColor: "#38BDF8", fontSize: 52, outlineColor: "#0C4A6E", uppercase: false, anim: "wave" }),
  P({ id: "sunset-orange", name: "Sunset Orange", group: "Street", font: "archivo", highlightColor: "#F97316", fontSize: 54 }),
  P({ id: "mint-fresh", name: "Mint Fresh", group: "Minimal", font: "system", highlightColor: "#34D399", fontSize: 42, outlineColor: "#064E3B", uppercase: false, anim: "none" }),
  P({ id: "crimson-bold", name: "Crimson Bold", group: "Hormozi", highlightColor: "#EF4444", fontSize: 62, outline: 5 }),
  P({ id: "ocean-deep", name: "Ocean Deep", group: "Neon", font: "montserrat", highlightColor: "#0EA5E9", primaryColor: "#E0F2FE", outlineColor: "#082F49", fontSize: 52, uppercase: false, anim: "none" }),
  P({ id: "forest-green", name: "Forest Green", group: "Street", font: "bebas", highlightColor: "#16A34A", fontSize: 60, outlineColor: "#052E16", anim: "none" }),
  P({ id: "lavender-pop", name: "Lavender Pop", group: "TikTok", font: "montserrat", highlightColor: "#C084FC", fontSize: 50, outlineColor: "#2E1065", uppercase: false }),
  P({ id: "cyber-yellow", name: "Cyber Yellow", group: "Neon", font: "archivo", highlightColor: "#FACC15", fontSize: 54, anim: "wave" }),
  P({ id: "retro-orange", name: "Retro Orange", group: "Luxe", font: "bebas", highlightColor: "#FB923C", primaryColor: "#FFF8EC", outlineColor: "#431407", fontSize: 62, anim: "none" }),
  P({ id: "blackout", name: "Blackout", group: "Minimal", highlightColor: "#FFFFFF", fontSize: 56, outline: 0, box: true, anim: "none" }),
  P({ id: "highlighter-blue", name: "Highlighter Blue", group: "TikTok", font: "montserrat", highlightColor: "#2563EB", fontSize: 50, outline: 3, uppercase: false }),
  P({ id: "cotton-candy", name: "Cotton Candy", group: "Minimal", font: "system", highlightColor: "#F472B6", fontSize: 42, outlineColor: "#500724", uppercase: false, anim: "none" }),
  P({ id: "volcano-red", name: "Volcano Red", group: "Hormozi", font: "archivo", highlightColor: "#DC2626", fontSize: 58, outline: 5 }),
  P({ id: "midnight-glow", name: "Midnight Glow", group: "Neon", highlightColor: "#818CF8", primaryColor: "#E0E7FF", outlineColor: "#0F172A", fontSize: 58, anim: "wave" }),
  P({ id: "pastel-dream", name: "Pastel Dream", group: "Minimal", font: "montserrat", highlightColor: "#F9A8D4", fontSize: 46, outlineColor: "#831843", outline: 2, uppercase: false, anim: "none" }),
  P({ id: "thunder-bold", name: "Thunder Bold", group: "Street", highlightColor: "#FDE047", fontSize: 64, outline: 6, maxWords: 3 }),
  P({ id: "bubblegum", name: "Bubblegum", group: "TikTok", font: "bebas", highlightColor: "#EC4899", fontSize: 58 }),
  P({ id: "steel-gray", name: "Steel Gray", group: "Outline", font: "archivo", highlightColor: "#E5E7EB", primaryColor: "#E5E7EB", outlineColor: "#111111", fontSize: 52, anim: "none" }),
  P({ id: "royal-purple", name: "Royal Purple", group: "Luxe", font: "montserrat", highlightColor: "#7C3AED", outlineColor: "#1E1B4B", fontSize: 52, anim: "none" }),
  P({ id: "emerald-wave", name: "Emerald Wave", group: "Karaoke", font: "bebas", highlightColor: "#10B981", fontSize: 60, anim: "wave" }),
  P({ id: "molten-lava", name: "Molten Lava", group: "Hormozi", font: "bebas", highlightColor: "#F97316", fontSize: 62, outline: 5, anim: "wave" }),
  P({ id: "arctic-frost", name: "Arctic Frost", group: "Outline", font: "montserrat", highlightColor: "#E0F2FE", outlineColor: "#0C4A6E", fontSize: 52, uppercase: false, anim: "none" }),
];

/* ------------------------------------------------------------------ */
/* karaoke timing                                                      */
/* ------------------------------------------------------------------ */

const WORD_DUR = 0.72; // seconds per word
const HOLD = 1.15; // pause after the line is fully lit

function pickWords(p: CaptionPresetSpec): string[] {
  const sets: Record<number, { up: string[]; low: string[] }> = {
    3: { up: ["GO", "VIRAL", "NOW"], low: ["Go", "viral", "now"] },
    4: { up: ["THIS", "CLIP", "GOES", "VIRAL"], low: ["This", "clip", "goes", "viral"] },
    5: { up: ["MAKE", "THIS", "CLIP", "GO", "VIRAL"], low: ["Make", "this", "clip", "go", "viral"] },
  };
  const s = sets[p.maxWords] ?? sets[4];
  return p.uppercase ? s.up : s.low;
}

function buildShadow(outline: number, color: string): string {
  const o = Math.max(1.2, +(outline * 0.5).toFixed(1));
  const dirs: Array<[number, number]> = [
    [o, o], [-o, o], [o, -o], [-o, -o], [o, 0], [-o, 0], [0, o], [0, -o],
  ];
  const parts = dirs.map(([x, y]) => `${x}px ${y}px 0 ${color}`);
  parts.push("0 5px 14px rgba(0, 0, 0, 0.55)");
  return parts.join(",\n    ");
}

function wordKeyframes(p: CaptionPresetSpec, i: number, tIn: number, tHold: number, tReset: number): string {
  const name = `capw-${p.id}-${i}`;
  const hold = `color: ${p.highlightColor};`;
  const base = `color: ${p.primaryColor};`;
  const pre = Math.max(0, +(tIn - 1).toFixed(1));
  if (p.anim === "none") {
    return `@keyframes ${name} {\n  0%,\n  ${pre}% {\n    ${base}\n  }\n  ${tIn}% {\n    ${hold}\n  }\n  ${tReset}%,\n  100% {\n    ${base}\n  }\n}`;
  }
  if (p.anim === "wave") {
    const land = Math.min(tHold - 0.5, +(tIn + 5).toFixed(1));
    return `@keyframes ${name} {\n  0%,\n  ${pre}% {\n    ${base}\n    transform: translateY(0);\n  }\n  ${tIn}% {\n    ${hold}\n    transform: translateY(-0.32em);\n  }\n  ${land}% {\n    transform: translateY(0.1em);\n  }\n  ${tHold}% {\n    ${hold}\n    transform: translateY(0);\n  }\n  ${tReset}%,\n  100% {\n    ${base}\n    transform: translateY(0);\n  }\n}`;
  }
  return `@keyframes ${name} {\n  0%,\n  ${pre}% {\n    ${base}\n    transform: scale(1);\n  }\n  ${tIn}% {\n    ${hold}\n    transform: scale(1.16);\n  }\n  ${tHold}% {\n    ${hold}\n    transform: scale(1.03);\n  }\n  ${tReset}%,\n  100% {\n    ${base}\n    transform: scale(1);\n  }\n}`;
}

function buildCaptionCss(p: CaptionPresetSpec, bg: string): string {
  const f = FONT_META[p.font];
  const words = pickWords(p);
  const n = words.length;
  const T = +(n * WORD_DUR + HOLD).toFixed(2);
  const tHold = +(((T - HOLD) / T) * 100).toFixed(1);
  const tReset = Math.min(97, +(tHold + 4).toFixed(1));
  const tIn = (i: number) => +(((0.35 + i * WORD_DUR) / T) * 100).toFixed(1);

  const fsCqw = (7.6 * (p.fontSize / 58)).toFixed(1);
  const fsMax = Math.round(p.fontSize * 0.55);
  const weight = f.weight ? `  font-weight: ${f.weight};\n` : "";
  const shadow = p.box ? null : buildShadow(p.outline, p.outlineColor);

  const out: string[] = [];
  out.push(`/* ${p.name} — Viralin karaoke caption preset (group: ${p.group})`);
  out.push(` * Ported to pure CSS from nadzirmuhamad5/viralin (ASS word-level \\k).`);
  out.push(` * Word-by-word highlight, loops forever, no JavaScript.`);
  out.push(` * .cap-stage = any video-like container; swap the background for your footage. */`);
  if (f.google) {
    out.push(``);
    out.push(`@import url("https://fonts.googleapis.com/css2?family=${f.google}&display=swap");`);
  }
  out.push(``);
  out.push(`.cap-stage {`);
  out.push(`  position: absolute;`);
  out.push(`  inset: 0;`);
  out.push(`  container-type: size;`);
  out.push(`  display: flex;`);
  out.push(`  align-items: flex-end;`);
  out.push(`  justify-content: center;`);
  out.push(`  padding: 8% 6% 13%;`);
  out.push(`  overflow: hidden;`);
  out.push(`  border-radius: inherit;`);
  out.push(`  background:`);
  out.push(`    linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.78) 100%),`);
  out.push(`    url("${bg}") center / cover no-repeat #0a0a0a;`);
  out.push(`}`);
  out.push(``);
  out.push(`.cap-line {`);
  out.push(`  display: flex;`);
  out.push(`  flex-wrap: wrap;`);
  out.push(`  justify-content: center;`);
  out.push(`  gap: 0.25em;`);
  out.push(`  margin: 0;`);
  out.push(`  max-width: 100%;`);
  out.push(`}`);
  out.push(``);
  out.push(`.cap-${p.id} {`);
  out.push(`  font-family: ${f.stack};`);
  out.push(weight + `  font-size: clamp(15px, ${fsCqw}cqw, ${fsMax}px);`);
  out.push(`  line-height: 1.1;`);
  out.push(`  letter-spacing: 0.01em;`);
  out.push(`  text-transform: ${p.uppercase ? "uppercase" : "none"};`);
  if (p.box) {
    out.push(`  background: ${p.outlineColor};`);
    out.push(`  padding: 0.16em 0.55em;`);
    out.push(`  border-radius: 10px;`);
    out.push(`  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);`);
  } else {
    out.push(`  text-shadow:`);
    out.push(`    ${shadow};`);
  }
  out.push(`}`);
  out.push(``);
  out.push(`.cap-${p.id} .kw {`);
  out.push(`  display: inline-block;`);
  out.push(`  color: ${p.primaryColor};`);
  out.push(`  animation: capw-${p.id}-0 ${T}s infinite;`);
  out.push(`}`);
  for (let i = 1; i < n; i++) {
    out.push(`.cap-${p.id} .kw:nth-child(${i + 1}) {`);
    out.push(`  animation-name: capw-${p.id}-${i};`);
    out.push(`}`);
  }
  out.push(``);
  for (let i = 0; i < n; i++) {
    out.push(wordKeyframes(p, i, tIn(i), tHold, tReset));
    out.push(``);
  }
  return out.join("\n").trimEnd() + "\n";
}

function buildCaptionHtml(p: CaptionPresetSpec): string {
  const words = pickWords(p);
  const spans = words.map((w) => `    <span class="kw">${w}</span>`).join("\n");
  return `<div class="cap-stage">
  <p class="cap-line cap-${p.id}">
${spans}
  </p>
</div>`;
}

function describe(p: CaptionPresetSpec): string {
  const animText =
    p.anim === "pop" ? "pop-in highlight per kata" : p.anim === "wave" ? "highlight melayang per kata" : "highlight tenang tanpa lompatan";
  const boxText = p.box ? " dengan kotak solid" : "";
  const fontName = p.font === "montserrat" ? "Montserrat ExtraBold" : p.font === "system" ? "font sistem" : (FONT_META[p.font].google ?? "Anton").replace("+", " ");
  return `Preset "${p.name}" grup ${p.group}${boxText} — ${animText}, font ${fontName}, ${p.maxWords} kata per baris. Loop otomatis.`;
}

const FB = "";
const BGS = [`${FB}/demo-street.png`, `${FB}/demo-studio.png`];

export const CAPTION_EFFECTS: CssEffect[] = CAPTION_PRESETS.map((p, i) => ({
  id: p.id,
  name: p.name,
  category: "captions",
  group: p.group,
  description: describe(p),
  tags: ["karaoke", "caption", "9:16", p.group.toLowerCase(), p.anim],
  demoHtml: buildCaptionHtml(p),
  css: buildCaptionCss(p, BGS[i % BGS.length]),
  tall: true,
}));
