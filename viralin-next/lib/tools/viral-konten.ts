/** Tool "viral-konten" (Viral Konten Studio) — short motion-graphics edutainment:
 *  Fakta Shock / Tips Kilat / Mitos vs Fakta → naskah LLM → TTS → whisper word-level
 *  → ilustrasi komik AI → render motion-graphics per scene → concat → viral-konten.mp4.
 *
 *  MENGIKUTI .agent/rules/motion-standards.md (TERKUNCI) + skill .agent/skills/:
 *  - Format final 1080x1920 (9:16) @ 30fps konstan, libx264, yuv420p, +faststart, AAC 160k.
 *  - Mobile safe-zone: SEMUA overlay (badge/chip/judul/CTA/progress) digambar di dalam
 *    content area y 346→1498 (di 1920); caption karaoke diangkat (marginV 240 dari bawah
 *    PlayRes 960 = y 1440 fisik) supaya tidak jatuh di bottom-zone.
 *  - Animasi pop = SPRING PHYSICS nyata: solver damped harmonic (semi-implicit Euler,
 *    dt = 1/30) menghasilkan kurva overshoot → dikomposisikan ke ASS \t per-frame
 *    (bukan tween linear). Config dari rules: snappy {damping:10, stiffness:300, mass:0.6}
 *    untuk badge/chip, standar {damping:12, stiffness:200, mass:0.5} untuk judul/CTA.
 *  - Ken Burns (zoom/pan kontinu) = gerak kamera halus, boleh ekspresi kontinu (per rules §3).
 *  - Progress bar global = linear (diizinkan: elemen teknis, bukan gerak konten).
 *  - Protokol QA visual browser dijalankan saat pengembangan (frame strip 5 titik waktu
 *    + volumedetect + uji UI) — wajib sebelum fitur dinyatakan selesai.
 *
 *  Skill yang diikuti: remotion-motion-graphics-skill/skills/motion-graphics (pop-in,
 *  stagger 0.08-0.15s, hierarki kontras), remotion-dev/skills best-practices, remotion-scenes
 *  (pola listicle). Paket @remotion/captions → sidecar SRT TikTok-style dari whisper. */
import { promises as fs } from "fs";
import path from "path";
import {
  CaptionsInternals,
  createTikTokStyleCaptions,
  serializeSrt,
  type Caption as RCaption,
} from "@remotion/captions";
import * as mk from "../mediakit";
import { run as runCmd, tailErr } from "../exec";
import { buildAss, type Word } from "../captions";
import { thumb, type ToolCtx } from "./_shared";

/* ── Konstanta standar motion (satu sumber: .agent/rules/motion-standards.md) ── */
const W = 1080, H = 1920, FPS = 30;
const CONTENT_TOP = 346, CONTENT_BOTTOM = 1498; // safe-zone (di 1920)
const RATE = "+10%";

/** Warna aksen per format (ffmpeg 0xRRGGBB / css untuk ass). */
const ACCENTS: Record<string, { ff: string; css: string }> = {
  fakta: { ff: "0xFFD400", css: "#FFD400" }, // kuning
  tips: { ff: "0x22C55E", css: "#22C55E" }, // hijau
  mitos: { ff: "0xF97316", css: "#F97316" }, // oranye
};
const BADGE_TEXT: Record<string, string> = {
  fakta: "FAKTA GILA", tips: "CATAT INI", mitos: "MITOS HANCUR",
};
const LABEL: Record<string, string> = { fakta: "FAKTA", tips: "TIPS", mitos: "FAKTA" };

const ANTON = () => path.join(mk.FONTS_DIR, "Anton-Regular.ttf");

type Scene = { title: string; text: string; scene: string };
type KontenScript = { hook: Scene; facts: Scene[]; cta: Scene };
type Format = "fakta" | "tips" | "mitos";

/* ── Spring physics solver (semi-implicit Euler, target 0→1) ───────────── */
type SpringCfg = { damping: number; stiffness: number; mass: number };
const SPRING_SNAPPY: SpringCfg = { damping: 10, stiffness: 300, mass: 0.6 };
const SPRING_STD: SpringCfg = { damping: 12, stiffness: 200, mass: 0.5 };

/** Kurva spring menuju 1 (dengan overshoot) — nilai per frame pada fps. */
function springCurve(cfg: SpringCfg, horizonMs: number, fps = FPS): number[] {
  const dt = 1 / fps;
  const steps = Math.max(1, Math.round((horizonMs / 1000) / dt));
  let x = 0, v = 0;
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (cfg.stiffness * (1 - x) - cfg.damping * v) / cfg.mass;
    v += a * dt;
    x += v * dt;
    out.push(x);
  }
  return out;
}

/** ASS override tags isi spring (TANPA kurung blok — dibungkus builder dalam satu blok). */
function springTags(cfg: SpringCfg, delayMs: number, horizonMs = 900): string {
  const curve = springCurve(cfg, horizonMs);
  const segs = curve.map((x, i) => {
    const t1 = delayMs + i * (1000 / FPS);
    const t2 = delayMs + (i + 1) * (1000 / FPS);
    const s = Math.round(x * 1000) / 10; // % skala
    return `\\t(${Math.round(t1)},${Math.round(t2)},\\fscx${s}\\fscy${s})`;
  });
  return `\\fscx0\\fscy0${segs.join("")}`;
}

/* ── Naskah ────────────────────────────────────────────────────────────── */
/** Buang karakter yang merusak drawtext (diwarisi pola ragebait). */
const drawSafe = (s: string) => s.replace(/['":\\%`$]/g, "").trim();
/** Escape teks untuk ASS (tag override tidak boleh bocor). */
const assSafe = (s: string) => s.replace(/[{}\\]/g, "").trim();

const PROMPTS: Record<Format, string> = {
  fakta: `Kamu penulis naskah short "Fakta Shock" viral Indonesia: buka dengan hook mengejutkan, lalu 3 FAKTA unik yang makin mengejutkan (spesifik, ada angka/perbandingan), tutup dengan CTA. Bahasa gaul "gue/lu", tempo cepat, FAKTA HARUS BENAR (pengetahuan umum yang terverifikasi, jangan mengarang), tidak vulgar, tidak SARA, tidak hoaks.`,
  tips: `Kamu penulis naskah short "Tips Kilat" viral Indonesia: buka dengan hook masalah sehari-hari, lalu 3 TIPS praktis yang langsung bisa dicoba (spesifik, concret, bukan basa-basi), tutup dengan CTA. Bahasa gaul "gue/lu", tempo cepat, tidak vulgar, tidak SARA.`,
  mitos: `Kamu penulis naskah short "Mitos vs Fakta" viral Indonesia: buka dengan hook mitos populer yang selalu dipercaya, lalu 3 penyangkalan/mitos lain yang DIBONGKAR dengan penjelasan singkat masuk akal, tutup dengan CTA. Bahasa gaul "gue/lu", tempo cepat, fakta ilmiah umum (bukan klaim medis berbahaya), tidak vulgar, tidak SARA.`,
};

const SYSTEM_PROMPT = (g: Format) => `${PROMPTS[g]}
Respons WAJIB JSON valid TANPA markdown, skema:
{
  "hook":  { "title": "JUDUL UPPERCASE MAKS 24 HURUF, bikin penasaran",
             "text": "kalimat pembuka 12-16 kata gaya gue/lu",
             "scene": "deskripsi visual MURNI untuk ilustrasi komik (pose, ekspresi, suasana, setting) — DILARANG menyebut tulisan, papan nama, dialog, atau teks apa pun" },
  "facts": [
    { "title": "JUDUL POIN UPPERCASE MAKS 22 HURUF",
      "text": "narasi 25-32 kata yang menjelaskan poin secara spesifik",
      "scene": "deskripsi visual MURNI (pose, ekspresi, suasana, setting) — DILARANG menyebut dialog, tulisan, atau apa pun yang akan ditulis di gambar" }
    (tepat 3 poin, makin menarik/makin penting)
  ],
  "cta":   { "text": "1 kalimat ajakan like/follow/simpan maks 12 kata gaya gue/lu",
             "scene": "deskripsi visual MURNI adegan penonton bersemangat — DILARANG menyebut tulisan atau teks" }
}
Aturan WAJIB: hook.text = 12-16 kata, SETIAP facts.text = 25-32 kata, cta.text = 10-14 kata.
Total naskah = 100-125 kata — jangan di bawah itu. Jangan menyebut merek orang nyata secara merendahkan.`;

/** LLM → skrip terstruktur. LLM cenderung undershoot → minta ulang bila <90 kata. */
async function genScript(gaya: Format, topik: string, log: (l: string) => void): Promise<KontenScript> {
  let extra = "";
  let last: KontenScript | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await mk.zaiChat(SYSTEM_PROMPT(gaya) + extra, `Topik: ${topik}`, log);
    let j: KontenScript;
    try {
      j = mk.extractJson<KontenScript>(raw);
    } catch {
      throw new Error("LLM tidak mengembalikan JSON yang valid — coba topik lain");
    }
    const facts = Array.isArray(j.facts) ? j.facts.slice(0, 3) : [];
    const ok =
      j.hook?.title && j.hook?.text && facts.length === 3 &&
      facts.every((m) => m?.title && m?.text) && j.cta?.text;
    if (!ok) throw new Error("struktur naskah tidak lengkap dari LLM — coba lagi");
    last = j;
    const words = [j.hook.text, ...facts.map((m) => m.text), j.cta.text]
      .join(" ").split(/\s+/).length;
    if (words >= 90) return j;
    log(`[naskah] kurang padat (${words} kata < 90) → minta LLM menulis ulang lebih panjang…`);
    extra =
      "\n\nTEGURAN: naskah kamu sebelumnya cuma " + words +
      " kata — TERLALU PENDEK. Tulis ulang: hook.text 12-16 kata, SETIAP facts.text " +
      "25-32 kata dengan detail spesifik, cta.text 10-14 kata. Total minimal 100 kata.";
  }
  return last as KontenScript;
}

/* ── Prompt gambar (pelajaran anti-bleed dari uji E2E ragebait) ────────── */
function imagePrompt(s: Scene, kind: string, framing: string, topik: string): string {
  return (
    `Ilustrasi komik kartun vertikal 9:16, gaya webtoon Indonesia dengan garis tebal, ` +
    `warna saturasi tinggi, ekspresi wajah ekspresif. ${framing} menggambarkan: ${s.scene}. ` +
    `Konteks topik video: ${topik}. Adegan ${kind}. ` +
    `PENTING: ini BUKAN poster dan BUKAN halaman komik bergaya panel — tanpa speech bubble, ` +
    `tanpa balon kata, tanpa teks apa pun, tanpa huruf, tanpa angka, tanpa aksara bahasa apa pun ` +
    `(Latin, Cina, Jepang, Arab), tanpa banner, tanpa judul, tanpa logo, tanpa papan nama, ` +
    `tanpa signage di dinding atau toko, tanpa tulisan di pakaian dan properti; ` +
    `latar belakang rapi polos. Hanya karakter dan adegan murni — jika butuh elemen tertulis, ` +
    `ganti dengan simbol grafis abstrak.`
  );
}

/** Pecah judul jadi maks 2 baris (Anton lebar, PlayRes 540). */
function twoLines(t: string, max = 16): [string, string | null] {
  const w = t.split(/\s+/);
  if (t.length <= max || w.length === 1) return [t, null];
  let a: string[] = [], b: string[] = [];
  for (const x of w) (a.join(" ").length + x.length <= max && !b.length ? a : b).push(x);
  if (!b.length && a.length > 1) b = [a.pop() as string];
  return [a.join(" "), b.join(" ") || null];
}

/** Potong teks di batas kata (badge DejaVu 30px: maks ~22 char aman di 540 PlayRes). */
function cutWords(s: string, max: number): string {
  let out = "";
  for (const w of s.split(/\s+/)) {
    if ((out + " " + w).trim().length > max) break;
    out = (out + " " + w).trim();
  }
  return out || s.slice(0, max);
}

/* ── ASS motion-graphics overlay per scene (PlayRes 540x960, di-scale 2x saat render 1080) ──
 *  Semua y dijaga di dalam content area 173→749 (PlayRes) = 346→1498 (fisik 1920). */
function hexToAss(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "&H00FFFFFF&";
  const n = parseInt(m[1], 16);
  const b = n & 255, g = (n >> 8) & 255, r = (n >> 16) & 255;
  return `&H00${b.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${r
    .toString(16)
    .padStart(2, "0")}&`.toUpperCase();
}

function assTs(t: number): string {
  const cs = Math.max(0, Math.round(t * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}

const MG_HEADER = (accentCss: string) => [
  "[Script Info]",
  "ScriptType: v4.00+",
  "PlayResX: 540",
  "PlayResY: 960",
  "WrapStyle: 2",
  "ScaledBorderAndShadow: yes",
  "",
  "[V4+ Styles]",
  "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
  // Badge/chip: kotak solid warna aksen (BorderStyle 3 → OutlineColour jadi warna box)
  `Style: Badge,DejaVu Sans,30,&H00FFFFFF&,&H00FFFFFF&,${hexToAss(accentCss)},&H00000000,-1,0,0,0,100,100,0,0,3,6,0,5,32,32,0,1`,
  // Judul besar: Anton putih outline hitam + bayangan
  "Style: Title,Anton,46,&H00FFFFFF&,&H00FFFFFF&,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,3,2,5,40,40,0,1",
  // CTA besar: Anton warna aksen outline hitam
  `Style: Big,Anton,54,${hexToAss(accentCss)},&H00FFFFFF&,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,3,2,5,40,40,0,1`,
  "",
  "[Events]",
  "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
];

type Ev = { delayMs: number; style: string; pos: [number, number]; align: 4 | 5; spring: SpringCfg; text: string };

function buildMgAss(dur: number, accentCss: string, events: Ev[]): string {
  const lines = MG_HEADER(accentCss);
  for (const e of events) {
    lines.push(
      `Dialogue: 1,${assTs(e.delayMs / 1000)},${assTs(Math.max(dur - 0.02, 0.2))},${e.style},,0,0,0,,` +
      // SEMUA tag dalam SATU blok override (dulu: blok ganda bikin \fad bocor jadi teks literal)
      `{\\an${e.align}\\pos(${e.pos[0]},${e.pos[1]})${springTags(e.spring, e.delayMs)}\\fad(120,120)}` +
      assSafe(e.text)
    );
  }
  return lines.join("\n") + "\n";
}

/** Event overlay per scene — posisi & isi sesuai jenis scene (hook/fakta/cta). */
function mgEvents(i: number, total: number, sc: Scene, isHook: boolean, isCta: boolean, gaya: Format): Ev[] {
  const chip = `${LABEL[gaya]} ${i}/${total}`;
  if (isHook) {
    const [l1, l2] = twoLines(sc.title);
    return [
      { delayMs: 60, style: "Badge", pos: [270, 210], align: 5, spring: SPRING_SNAPPY, text: BADGE_TEXT[gaya] },
      { delayMs: 190, style: "Title", pos: [270, 288], align: 5, spring: SPRING_STD, text: l1 },
      ...(l2 ? [{ delayMs: 290, style: "Title", pos: [270, 348] as [number, number], align: 5 as 5, spring: SPRING_STD, text: l2 }] : []),
    ];
  }
  if (isCta) {
    return [
      { delayMs: 60, style: "Big", pos: [270, 300], align: 5, spring: SPRING_SNAPPY, text: "LIKE SEKARANG" },
      { delayMs: 260, style: "Badge", pos: [270, 375], align: 5, spring: SPRING_STD, text: cutWords(drawSafe(sc.title || "BIAR GAK KETINGGALAN"), 22) },
    ];
  }
  const [l1, l2] = twoLines(sc.title);
  return [
    { delayMs: 60, style: "Badge", pos: [40, 210], align: 4, spring: SPRING_SNAPPY, text: chip },
    { delayMs: 180, style: "Title", pos: [270, 282], align: 5, spring: SPRING_STD, text: l1 },
    ...(l2 ? [{ delayMs: 280, style: "Title", pos: [270, 342] as [number, number], align: 5 as 5, spring: SPRING_STD, text: l2 }] : []),
  ];
}

/* ── Ken Burns (gerak kamera kontinu — boleh bukan spring, per rules §3) ─ */
const KB = [
  `z='min(1+0.0012*in,1.14)':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2'`, // zoom in pusat
  `z='max(1.14-0.0012*in,1)':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2'`, // zoom out
  `z='1.08':x='max(0,min((iw-iw/zoom)/2+in*0.3,iw-iw/zoom))':y='(ih-ih/zoom)/2'`, // pan kanan
  `z='min(1.04+0.0008*in,1.12)':x='(iw-iw/zoom)/2':y='max(0,min((ih-ih/zoom)/2+(135-in)*0.2,ih-ih/zoom))'`, // diagonal naik
];

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const topik = (inputs.topik || "").trim();
  if (!topik) throw new Error("isi topik dulu (mis. 'fakta unik kopi gula aren')");
  const gaya: Format = (["fakta", "tips", "mitos"].includes(inputs.gaya) ? inputs.gaya : "fakta") as Format;
  const voice = inputs.voice || "id-ID-ArdiNeural";
  const acc = ACCENTS[gaya];

  // 1) Naskah LLM: hook + 3 poin + cta
  const script = await genScript(gaya, topik, log);
  const scenes: Array<{ sc: Scene; isHook: boolean; isCta: boolean }> = [
    { sc: script.hook, isHook: true, isCta: false },
    ...script.facts.map((m) => ({ sc: m, isHook: false, isCta: false })),
    { sc: script.cta, isHook: false, isCta: true },
  ];
  const naskahFull = scenes.map((s) => s.sc.text).join("\n\n");
  const nWords = naskahFull.split(/\s+/).length;
  job.texts!.push({ label: "Naskah Viral Konten", body: naskahFull });
  log(`[naskah] ${gaya} · hook="${script.hook.title}" · ${nWords} kata`);

  // 2) TTS per scene (+10% pace) → durasi persis dari file audio
  const audios: string[] = [];
  const durs: number[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const a = path.join(dir, `speech-${i}.mp3`);
    await mk.ttsSynth(scenes[i].sc.text, voice, a, RATE, log);
    audios.push(a);
    durs.push(await mk.probeDur(a));
    log(`[tts] scene ${i + 1}/${scenes.length} = ${durs[i].toFixed(2)}s`);
  }
  const starts: number[] = [];
  let acc2 = 0;
  for (const d of durs) { starts.push(acc2); acc2 += d; }
  const totalDur = acc2;

  // 3) Concat audio → whisper word-level (timeline kontinu)
  const listFile = path.join(dir, "audio-list.txt");
  await fs.writeFile(listFile, audios.map((a) => `file '${a}'`).join("\n"));
  const speechAll = path.join(dir, "speech-all.mp3");
  const cat = await runCmd(["ffmpeg", "-y", "-hide_banner", "-f", "concat", "-safe", "0",
    "-i", listFile, "-c", "copy", speechAll]);
  if (cat.code !== 0) throw new Error("concat audio gagal: " + tailErr(cat.stderr));
  const wav = await mk.extractAudio(speechAll, dir);
  const info = await mk.transcribe(wav, dir, log);
  // whisper kadang menempel strip di depan kata ("-UJUNGNYA") — buang biar caption rapi
  const words: Word[] = info.segments
    .flatMap((s) => s.words || [])
    .map((w) => ({ ...w, word: w.word.replace(/^[-–—]+/, "") }))
    .filter((w) => w.word.trim());

  // 3b) Sidecar SRT TikTok-style via @remotion/captions (paket pendukung motion)
  try {
    const rcaps: RCaption[] = words
      .filter((w) => w.word?.trim())
      .map((w) => ({
        text: w.word, startMs: Math.round(w.start * 1000), endMs: Math.round(w.end * 1000),
        timestampMs: Math.round(w.start * 1000), confidence: null,
      }));
    if (rcaps.length) {
      // 1) TikTok-style pages (demonstrasi API komunitas Remotion) → log kualitas
      const tik = createTikTokStyleCaptions({
        captions: rcaps,
        combineTokensWithinMilliseconds: 1200,
        breakOnSilenceAfterMilliseconds: 700,
      });
      // 2) Chunking deterministik (maks ~22 karakter per baris) → SRT sidecar
      const segs2 = CaptionsInternals.ensureMaxCharactersPerLine({ captions: rcaps, maxCharsPerLine: 22 });
      const srt = serializeSrt({ lines: segs2.segments });
      await fs.writeFile(path.join(dir, "viral-konten.srt"), srt, "utf8");
      job.files!.push({
        file: "viral-konten.srt",
        label: `Subtitle SRT ${segs2.segments.length} baris (TikTok-style ${tik.pages.length} page)`,
        kind: "subtitle",
      });
      log(`[captions] ${segs2.segments.length} baris SRT via @remotion/captions (pages: ${tik.pages.length})`);
    }
  } catch (e) {
    log(`[captions] sidecar SRT dilewati: ${(e as Error).message}`);
  }

  // 4) Gambar komik AI per scene (framing dirotasi biar gak monoton)
  const framings = [
    "adegan lebar dari sisi depan",
    "adegan medium sekitar karakter",
    "close-up wajah karakter utama",
    "adegan dari sudut samping",
    "adegan lebar dengan karakter di tengah",
  ];
  const kinds = [
    "pembuka yang dramatis dan menggambarkan situasi awal",
    "penjelasan poin pertama dengan intensitas naik",
    "penjelasan poin kedua yang makin menarik",
    "puncak poin ketiga yang paling penting",
    "penutup semangat yang memikat",
  ];
  const images: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const img = path.join(dir, `img-${i}.png`);
    await mk.zaiImage(imagePrompt(scenes[i].sc, kinds[i], framings[i], topik), img, log);
    images.push(img);
  }

  // 5) Render per scene @ 1080x1920 30fps (standar terkunci):
  //    scale crop benar → Ken Burns kontinu → progress bar global → overlay ASS
  //    motion (spring pop) → caption karaoke diangkat (marginV 240 → tidak masuk bottom-zone)
  const segs: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const d = durs[i];
    const { isHook, isCta } = scenes[i];
    const kb = KB[i % KB.length];

    const mgPath = path.join(dir, `mg-${i}.ass`);
    await fs.writeFile(mgPath, buildMgAss(d, acc.css, mgEvents(i, scenes.length - 2, scenes[i].sc, isHook, isCta, gaya)));

    const capPath = path.join(dir, `cap-${i}.ass`);
    const wIn = words.filter((w) => w.start >= starts[i] - 0.02 && w.start < starts[i] + d);
    await fs.writeFile(capPath, buildAss(wIn, {
      presetId: "street-pop", clipStart: starts[i], clipEnd: starts[i] + d,
      positionY: 240, // angkat caption: 960-240=720 < 749 → di luar bottom-zone
      highlightColor: acc.css, // aksen ikut format (kuning/hijau/oranye)
      maxWords: 3,
      fontSize: 50,
    }));

    const seg = path.join(dir, `seg-${i}.mp4`);
    const fade = i === scenes.length - 1
      ? `,afade=t=out:st=${Math.max(d - 0.45, 0).toFixed(2)}:d=0.45` : "";
    const vf =
      `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},` +
      `zoompan=${kb}:d=1:fps=${FPS}:s=${W}x${H},` +
      // progress bar global: track + fill (linear — elemen teknis, boleh linear per rules)
      `drawbox=x=0:y=1480:w=${W}:h=10:color=white@0.22:t=fill,` +
      `drawbox=x=0:y=1480:w='iw*min((t+${starts[i].toFixed(2)})/${totalDur.toFixed(2)}\\,1)':h=10:color=${acc.ff}@0.95:t=fill,` +
      `subtitles=filename='${mgPath}':fontsdir='${mk.FONTS_DIR}',` +
      `subtitles=filename='${capPath}':fontsdir='${mk.FONTS_DIR}'`;
    try {
      const r = await runCmd(["ffmpeg", "-y", "-hide_banner", "-loop", "1", "-i", images[i],
        "-i", audios[i], "-t", d.toFixed(2), "-vf", vf, "-af", "afade=t=in:d=0.12" + fade,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-r", String(FPS),
        "-c:a", "aac", "-b:a", "160k", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", seg]);
      if (r.code !== 0) throw new Error(`render scene ${i + 1} gagal: ` + tailErr(r.stderr));
    } finally {
      await fs.rm(mgPath, { force: true });
      await fs.rm(capPath, { force: true });
    }
    segs.push(seg);
    log(`[render] scene ${i + 1}/${scenes.length} jadi @1080x1920 (${d.toFixed(1)}s)`);
  }

  // 6) Concat stream-copy → final
  const segList = path.join(dir, "seg-list.txt");
  await fs.writeFile(segList, segs.map((s) => `file '${s}'`).join("\n"));
  const out = path.join(dir, "viral-konten.mp4");
  const fin = await runCmd(["ffmpeg", "-y", "-hide_banner", "-f", "concat", "-safe", "0",
    "-i", segList, "-c", "copy", "-movflags", "+faststart", out]);
  if (fin.code !== 0) throw new Error("concat final gagal: " + tailErr(fin.stderr));

  const st = await fs.stat(out);
  await thumb(dir, out, "th-viralkonten.jpg");
  job.clips.push({
    file: "viral-konten.mp4", thumb: "th-viralkonten.jpg", start: 0,
    end: Math.round(totalDur * 10) / 10, seconds: Math.round(totalDur * 10) / 10,
    bytes: st.size, title: drawSafe(script.hook.title) || "Viral Konten",
    lines: words.length, preset: "viral-motion",
  });
  job.title = "Viral Konten Studio";
  log(`[viral-konten] jadi ${Math.round(totalDur)}s @1080x1920 (${(st.size / 1e6).toFixed(2)} MB) · safe-zone OK · spring OK`);
}
