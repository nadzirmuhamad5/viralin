import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DATA, jobs, persist, type Clip, type Job, type Stage } from "./store";
import { buildAss, DEFAULT_PRESET, type Word } from "./captions";
import { runTool } from "./toolrun";
import { ytdlpFetch, transcribe, fetchVttSubs, zaiChat, extractJson, type Seg } from "./mediakit";
import { run, tailErr } from "./exec";
import { FONTS_DIR, PY } from "./config";
import { queueStats } from "./queue";

const STAGES: Array<[string, string]> = [
  ["download", "⬇️ yt-dlp — unduh audio"],
  ["probe", "🔎 ffprobe — durasi & metadata"],
  ["transcribe", "🎙️ faster-whisper — transkrip + timestamp"],
  ["analyze", "🧠 pilih momen — LLM + kepadatan ujaran"],
  ["render", "🎬 ffmpeg — render klip 9:16 + caption"],
];

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

const TOOL_STAGES: Array<[string, string]> = [
  ["sumber", "📥 siapkan sumber (unduh/upload)"],
  ["proses", "⚙️ proses tool"],
  ["hasil", "📦 susun hasil"],
];

export function createJob(
  url: string,
  preset?: string,
  tool = "klip-ai",
  inputs?: Record<string, string>
): Job {
  const id = randomUUID().slice(0, 8);
  const stages = tool === "klip-ai"
    ? STAGES
    : TOOL_STAGES;
  const job: Job = {
    id,
    url,
    title: url,
    status: "queued",
    createdAt: Date.now(),
    captionPreset: preset || DEFAULT_PRESET,
    tool,
    inputs,
    files: tool === "klip-ai" ? undefined : [],
    texts: tool === "klip-ai" ? undefined : [],
    stages: stages.map(([name, label]) => ({ name, label, status: "pending" })),
    logs: [],
    clips: [],
  };
  jobs.set(id, job);
  // log pipeline pertama: job lahir + kondisi antrean saat itu
  const q = queueStats();
  pushLog(job, `[job] dibuat · tool ${tool}${preset ? ` · preset ${preset}` : ""} · antrean ${q.active} jalan / ${q.waiting} menunggu`);
  return job;
}

function setStage(job: Job, name: string, status: Stage["status"]) {
  const s = job.stages.find((x) => x.name === name);
  if (!s) return;
  if (status === "run") {
    // penanda mulai tahap + simpan waktu mulai utk durasi
    s.status = "run";
    s.ms = undefined;
    s.since = Date.now();
    pushLog(job, `▶️ ${s.label}`);
  } else if (status === "done" || status === "fail") {
    s.status = status;
    s.ms = Date.now();
    const dur = s.since ? ` — ${((s.ms - s.since) / 1000).toFixed(1)}s` : "";
    pushLog(job, (status === "done" ? "✅ " : "❌ ") + s.label + (status === "done" ? dur : ""));
  }
}

function pushLog(job: Job, line: string, persistToo = false) {
  // setiap baris beri timestamp agar urutan pipeline terbaca jelas di UI
  const t = new Date();
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  const ss = String(t.getSeconds()).padStart(2, "0");
  const text = `[${hh}:${mm}:${ss}] ${line.slice(0, 240)}`;
  job.logs.push(text);
  if (job.logs.length > 160) job.logs.splice(0, job.logs.length - 140);
  // mirror ke console server — jejak pipeline tiap job ikut tercatat di log proses
  console.log(`[pipeline ${job.id}] ${line.slice(0, 240)}`);
  if (persistToo) void persist(job);
}

/** Ringkasan tahap utk log akhir pipeline: nama:status(durasi). */
function stageSummary(job: Job): string {
  return job.stages
    .map((s) => {
      const dur = s.since && s.ms ? `(${((s.ms - s.since) / 1000).toFixed(1)}s)` : "";
      return `${s.name}:${s.status}${dur}`;
    })
    .join(" · ");
}

type Proposal = { start: number; end: number; score: number };

function pickProposals(segs: Seg[], cuts: number[], dur: number, maxClips = 6): Proposal[] {
  const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
  const cands: Array<Proposal & { words: number }> = [];
  for (let i = 0; i < segs.length; i++) {
    const start = segs[i].start;
    let bestEnd = 0, bestJ = -1, bestPen = 1e9;
    for (let j = i; j < segs.length; j++) {
      const d = segs[j].end - start;
      if (d > 45) break;
      if (d < 15) continue;
      const pen = Math.abs(d - 30) / 30;
      if (pen < bestPen) { bestPen = pen; bestEnd = segs[j].end; bestJ = j; }
    }
    if (bestEnd <= 0) continue;
    const d = bestEnd - start;
    const w = segs.slice(i, bestJ + 1).reduce((a, s) => a + words(s.text), 0);
    const cutsIn = cuts.filter((t) => t > start + 0.2 && t < bestEnd - 0.2).length;
    const score = r2((w / d) * 3 + (cutsIn / d) * 8);
    cands.push({ start: r2(start), end: r2(bestEnd), score, words: w });
  }
  cands.sort((a, b) => b.score - a.score);
  const picked: Proposal[] = [];
  for (const c of cands) {
    if (picked.length >= maxClips) break;
    if (picked.every((p) => c.end <= p.start || c.start >= p.end)) {
      picked.push({ start: c.start, end: c.end, score: c.score });
    }
  }
  if (!picked.length) {
    // fallback: window tunggal awal video / berbasis scene
    if (cuts.length >= 3) {
      for (let i = 0; i < cuts.length - 1 && picked.length < maxClips; i++) {
        const start = cuts[i];
        const end = cuts.find((t) => t > start + 15 && t <= start + 45);
        if (end && picked.every((p) => end <= p.start || start >= p.end)) {
          picked.push({ start: r2(start), end: r2(end), score: 0 });
        }
      }
    }
    if (!picked.length && dur > 15) {
      picked.push({ start: 0, end: r2(Math.min(30, dur)), score: 0 });
    }
  }
  return picked;
}

/** Setting AI clipper (ala ClipFlow: min score, maks klip, durasi min/maks).
 *  Dibaca dari form tool (job.inputs); nilai tidak valid → default. */
export type ClipSettings = { minScore: number; maxClips: number; minDur: number; maxDur: number };
export function clipSettings(inputs?: Record<string, string>): ClipSettings {
  const num = (v: string | undefined, def: number, lo: number, hi: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
  };
  const minDur = num(inputs?.min_dur, 15, 5, 120);
  const maxDur = Math.max(minDur, num(inputs?.max_dur, 45, 15, 300));
  return {
    minScore: num(inputs?.min_score, 7, 1, 10),
    maxClips: Math.round(num(inputs?.max_clips, 6, 1, 10)),
    minDur,
    maxDur,
  };
}

/** Validasi momen dari LLM: clamp ke durasi, minDur-maxDur dtk, tidak tumpang tindih, maks `max`, urut. */
export function sanitizeMoments(
  momen: Array<{ mulai?: number; selesai?: number; skor?: number }>,
  dur: number,
  max = 3,
  minDur = 15,
  maxDur = 45
): Proposal[] {
  const out: Proposal[] = [];
  for (const m of momen || []) {
    const start = r2(Math.max(0, Number(m.mulai) || 0));
    const end = r2(Math.min(dur, Number(m.selesai) || 0));
    if (end - start < minDur || end - start > maxDur) continue;
    if (out.some((p) => start < p.end && end > p.start)) continue; // tumpang tindih
    out.push({ start, end, score: r2(Number(m.skor) || 0) });
    if (out.length >= max) break;
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Deteksi tipe konten dari transkrip via skor keyword (ala ClipFlow ai.py).
 *  Gaming: kata berat ×3 (×2 kalau <3), kata ringan ×1 (hanya kalau kata berat >=3),
 *  penalti ×0.6 kalau banyak kata non-gameplay. Tipe dipakai kalau skornya
 *  mencapai ambang (gaming >=5, lainnya >=3), kalau tidak → "general". */
export type ContentType = "gaming" | "podcast" | "music" | "tutorial" | "general";
export function detectContentType(segs: Seg[]): { type: ContentType; scores: Record<string, number> } {
  const text = segs.map((s) => s.text).join(" ").toLowerCase();
  const has = (kws: string[]) => kws.filter((k) => text.includes(k)).length;
  const gamingHeavy = ["teamfight", "team fight", "clutch", "savage", "maniac", "legendary", "pentakill", "mvp", "turnamen", "tournament", "mlbb", "mobile legends", "pubg", "valorant", "free fire", "mpl", "ranked", "baron", "lord", "turtle", "jungle", "gank", "kill streak", "double kill", "triple kill", "first blood", "gold lane", "mid lane"];
  const gamingLight = ["kill", "tower", "hero", "skill", "ultimate", "respawn", "dragon", "creep", "minion", "farm", "gg", "rank", "mythic", "damage", "heal", "carry", "support", "tank", "assassin", "mage", "marksman", "fighter", "match", "round"];
  const nonGameplay = ["subscribe", "like video", "follow", "share", "notification", "comment", "instagram", "tiktok", "youtube channel", "discord", "donasi", "lobby", "hero selection", "draft pick", "menu", "settings", "review", "unboxing", "selamat datang", "halo semuanya", "terima kasih", "jangan lupa", "sampai jumpa"];
  const podcastKw = ["cerita", "ngobrol", "bahas", "podcast", "menurut saya", "saya rasa", "opini", "pendapat", "topik", "episode", "pendengar", "tamu", "wawancara", "interview", "sharing", "pengalaman", "curhat", "story time", "jadi gini", "beneran", "serius", "cinta", "pacar", "mantan", "hubungan", "bucin", "trending", "viral", "fyp"];
  const musicKw = ["lirik", "lyrics", "lagu", "music", "nyanyi", "chorus", "verse", "bridge", "reff", "melody", "album", "music video", "cover", "remix", "dj", "beat", "instrumental", "chord", "kunci gitar"];
  const tutorialKw = ["tutorial", "cara", "how to", "langkah", "mudah", "pertama", "kedua", "selanjutnya", "setting", "pengaturan", "install", "download", "ikuti", "caranya", "langkahnya"];
  const heavy = has(gamingHeavy);
  const light = has(gamingLight);
  let gaming = heavy >= 3 ? heavy * 3 + light : heavy * 2;
  if (has(nonGameplay) > 8) gaming = Math.floor(gaming * 0.6);
  const scores: Record<string, number> = {
    gaming,
    podcast: has(podcastKw),
    music: has(musicKw),
    tutorial: has(tutorialKw),
  };
  const best = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0] || ["general", 0]) as [string, number];
  const minScore: Record<string, number> = { gaming: 5, podcast: 3, music: 3, tutorial: 3 };
  const type = best[1] >= (minScore[best[0]] ?? 99) ? (best[0] as ContentType) : "general";
  return { type, scores };
}

/** Instruksi tambahan per tipe konten untuk system prompt LLM (1 baris tiap tipe). */
const TYPE_PROMPT: Record<ContentType, string> = {
  gaming: "Konten gaming: cari momen aksi (teamfight, kill beruntun, clutch, comeback, curi objective) — abaikan intro, lobby, draft pick, dan ajakan subscribe.",
  podcast: "Konten podcast/obrolan: cari opini tajam, cerita lucu, momen emosional, perdebatan, atau pengakuan mengejutkan — yang bisa berdiri sendiri sebagai klip.",
  music: "Konten musik: cari bagian chorus/hook yang paling catchy, drop, atau momen energi tinggi.",
  tutorial: "Konten tutorial: cari langkah penting, tips kunci, demo, dan hasil akhir (before/after).",
  general: "",
};

/** Potong transkrip ke budget karakter dengan sampling merata (awal/tengah/akhir tetap terwakili). */
function capTranscript(lines: string[], maxChars: number): string {
  const full = lines.join("\n");
  if (full.length <= maxChars) return full;
  const step = Math.ceil(full.length / maxChars);
  return lines.filter((_, i) => i % step === 0).join("\n").slice(0, maxChars);
}

/** Satu jendela 25 menit → maks 2 momen via LLM. Gagal → null (jendela lain tetap jalan). */
async function pickWindowLLM(winSegs: Seg[], winStart: number, winEnd: number, dur: number, job: Job, cs: ClipSettings, ctype: ContentType = "general"): Promise<Proposal[] | null> {
  const transkrip = capTranscript(
    winSegs.map((s) => `[${s.start.toFixed(1)}–${s.end.toFixed(1)}s] ${s.text}`),
    25000
  );
  if (!transkrip) return null;
  try {
    const raw = await zaiChat(
      'Kamu analis konten viral TikTok/Reels Indonesia. Pilih momen terbaik dari transkrip untuk dijadikan klip pendek. Balas HANYA JSON: {"momen":[{"mulai":0,"selesai":30,"skor":8.5,"alasan":"..."}]}. ' +
        `Maks 2 momen, tiap momen ${cs.minDur}-${cs.maxDur} detik (ideal ±30 detik), tidak tumpang tindih, dalam durasi video. Skor 1-10 seberapa viral momen itu (hook, emosi, layak dishare). Prioritaskan hook kuat di awal, momen emosional/energi tinggi, dan kalimat yang utuh (jangan potong di tengah kalimat).` +
        (TYPE_PROMPT[ctype] ? ` ${TYPE_PROMPT[ctype]}` : ""),
      `Durasi video: ${Math.round(dur)}s. Jendela analisis ini: ${winStart}–${winEnd}s — pilih momen HANYA dalam jendela ini.\nTranskrip ber-timestamp:\n${transkrip}`,
      (l) => pushLog(job, l)
    );
    const j = extractJson<{ momen?: Array<{ mulai?: number; selesai?: number; skor?: number; alasan?: string }> }>(raw);
    const out = sanitizeMoments(j.momen || [], dur, 2, cs.minDur, cs.maxDur);
    if (!out.length) return null;
    return out;
  } catch (e) {
    pushLog(job, `[ai] jendela ${winStart}–${winEnd}s gagal, dilewati — ${String((e as Error)?.message || e).slice(0, 120)}`);
    return null;
  }
}

/** Ambil skor motion per detik untuk video gaming (ala ClipFlow gaming.py).
 *  Download video low-res (<=360p) lalu jalankan worker/motion.py (OpenCV,
 *  CPU saja). Return Map detik->skor, atau null kalau gagal / OpenCV tidak ada
 *  — pemanggil lanjut tanpa sinyal motion (fallback aman). */
async function fetchMotion(
  url: string,
  dir: string,
  cookies: string | undefined,
  log: (l: string) => void
): Promise<Map<number, number> | null> {
  const low = path.join(dir, "motion.%(ext)s");
  try {
    await ytdlpFetch(
      ["--no-cache-dir", "--no-warnings", "--newline",
       "-f", "worstvideo[height<=360]/worstvideo/worst",
       "-o", low],
      url, cookies, log
    );
    let vid = "";
    for (const f of await fs.readdir(dir)) {
      if (f.startsWith("motion.")) vid = path.join(dir, f);
    }
    if (!vid) return null;
    const outJson = path.join(dir, "motion.json");
    const worker = path.join(process.cwd(), "worker", "motion.py");
    const r = await run([PY, worker, vid, "--out", outJson], { timeout: 600_000 });
    if (r.code !== 0) {
      log(`[motion] gagal (OpenCV belum terpasang?) — lanjut tanpa sinyal motion`);
      return null;
    }
    const data = JSON.parse(await fs.readFile(outJson, "utf-8")) as { points?: Array<{ time: number; score: number }> };
    const map = new Map<number, number>();
    for (const p of data.points || []) map.set(Math.floor(p.time), p.score);
    if (!map.size) return null;
    log(`[motion] ${map.size} titik motion siap`);
    return map;
  } catch (e) {
    log(`[motion] gagal — lanjut tanpa sinyal motion (${String((e as Error)?.message || e).slice(0, 100)})`);
    return null;
  }
}

/** Rata-rata skor motion dalam [start, end) dari Map detik->skor. */
export function avgMotion(motion: Map<number, number> | null, start: number, end: number): number {
  if (!motion || !motion.size) return 0;
  let sum = 0, n = 0;
  for (let t = Math.floor(start); t < end; t++) {
    const v = motion.get(t);
    if (v !== undefined) { sum += v; n++; }
  }
  return n ? sum / n : 0;
}

/** Boost skor momen berdasar motion relatif (gaming): momen dengan motion
 *  tertinggi di video dapat +1.0, sisanya proporsional. Tanpa motion → tidak berubah. */
export function applyMotionBoost(
  ranked: Array<{ mulai: number; selesai: number; skor: number }>,
  motion: Map<number, number> | null
): Array<{ mulai: number; selesai: number; skor: number }> {
  if (!motion || !motion.size) return ranked;
  const maxMotion = Math.max(0, ...motion.values());
  if (maxMotion <= 0) return ranked;
  return ranked.map((m) => ({
    ...m,
    skor: r2(m.skor + (avgMotion(motion, m.mulai, m.selesai) / maxMotion) * 1.0),
  }));
}

/** Pilih momen pakai LLM (provider dari Pengaturan — Gemini kalau provider=gemini).
 *  Video panjang dianalisis per jendela 25 menit agar tiap call LLM hemat token,
 *  lalu kandidat dari semua jendela digabung dan dipilih BERDASAR SKOR VIRAL:
 *  semua momen dengan skor >= minScore diambil (maks maxClips klip); kalau tidak
 *  ada yang mencapai minScore, ambil 3 skor tertinggi agar job tetap menghasilkan klip.
 *  Gagal / tidak valid → null, pemanggil pakai pickProposals rule-based. */
async function pickMomentsLLM(segs: Seg[], dur: number, job: Job, cs: ClipSettings, ctype: ContentType = "general", motion: Map<number, number> | null = null): Promise<Proposal[] | null> {
  const WIN = 1500; // 25 menit per jendela
  const windows = new Map<number, Seg[]>();
  for (const s of segs) {
    const w = Math.floor(s.start / WIN);
    const arr = windows.get(w) ?? [];
    arr.push(s);
    windows.set(w, arr);
  }
  const all: Proposal[] = [];
  for (const [w, winSegs] of [...windows.entries()].sort((a, b) => a[0] - b[0])) {
    const winStart = w * WIN;
    const winEnd = Math.min((w + 1) * WIN, dur);
    const got = await pickWindowLLM(winSegs, winStart, winEnd, dur, job, cs, ctype);
    if (got) all.push(...got);
  }
  if (!all.length) return null;
  // sinyal motion (gaming): boost skor momen yang aksinya tinggi (maks +1.0)
  const ranked = applyMotionBoost(
    all.map((p) => ({ mulai: p.start, selesai: p.end, skor: p.score })),
    motion
  ).sort((a, b) => (b.skor ?? 0) - (a.skor ?? 0));
  // pilih berdasar nilai keviralan, bukan jumlah tetap
  const viral = ranked.filter((m) => (m.skor ?? 0) >= cs.minScore);
  const picked = viral.length ? viral.slice(0, cs.maxClips) : ranked.slice(0, 3);
  const out = sanitizeMoments(picked, dur, cs.maxClips, cs.minDur, cs.maxDur);
  if (!out.length) return null;
  pushLog(job, `[ai] momen dipilih LLM: ${out.map((p) => `${p.start}–${p.end}s`).join(" · ")}`, true);
  return out;
}

/** Kumpulkan semua kata ber-timestamp dari segmen whisper (untuk caption karaoke). */
function allWords(segs: Seg[]): Word[] {
  const out: Word[] = [];
  for (const s of segs) {
    if (Array.isArray(s.words) && s.words.length) out.push(...s.words);
  }
  return out;
}

export async function runJob(job: Job): Promise<void> {
  job.status = "run";
  await persist(job);
  const t0 = Date.now();
  const dir = path.join(DATA, job.id);
  await fs.mkdir(dir, { recursive: true });
  let curStage = "";
  let logTick = 0;
  pushLog(job, `[job] mulai diproses · antre ${((t0 - job.createdAt) / 1000).toFixed(0)}s`, true);

  // ── jalur tool generik (semua fitur selain klip-ai) ────────────────
  if (job.tool && job.tool !== "klip-ai") {
    try {
      pushLog(job, `[job] tool ${job.tool} · id ${job.id}`, true);
      setStage(job, "sumber", "run");
      setStage(job, "proses", "run");
      await runTool(job, dir, (l: string) => pushLog(job, l));
      setStage(job, "sumber", "done");
      setStage(job, "proses", "done");
      curStage = "hasil";
      setStage(job, "hasil", "run");
      job.status = "done";
      setStage(job, "hasil", "done");
      pushLog(job, `✅ selesai · ${stageSummary(job)} · total ${((Date.now() - t0) / 1000).toFixed(1)}s`, true);
      return;
    } catch (e) {
      job.status = "fail";
      job.error = String((e as Error)?.message || e);
      for (const s of job.stages) if (s.status === "run") s.status = "fail";
      pushLog(job, `❌ gagal${curStage ? ` di tahap ${curStage}` : ""} · ${stageSummary(job)} · total ${((Date.now() - t0) / 1000).toFixed(1)}s`, true);
      pushLog(job, "❌ " + job.error, true);
      await persist(job);
      return;
    }
  }

  try {
    pushLog(job, `[job] klip-ai · id ${job.id} · preset ${job.captionPreset}`, true);
    // ── 1. unduh AUDIO saja (clipper tidak butuh full video) ───────
    // Coba subtitle VTT dulu (fast-path) — kalau ada dan cukup, skip audio + Whisper.
    curStage = "download";
    setStage(job, "download", "run");
    logTick = 0;
    let segs: Seg[] = [];
    let dur = 0;
    let useVtt = false;
    let src = "";
    const vttSegs = await fetchVttSubs(job.url, dir, job.inputs?.cookies, (l) => pushLog(job, l));
    const vttChars = vttSegs ? vttSegs.reduce((a, s) => a + s.text.length, 0) : 0;
    const vttDur = vttSegs ? Math.max(0, ...vttSegs.map((s) => s.end)) : 0;
    if (vttSegs && vttChars >= 500 && vttDur > 0) {
      segs = vttSegs;
      dur = vttDur;
      useVtt = true;
      pushLog(job, `[sub] pakai subtitle VTT (${segs.length} segmen, ${vttChars} karakter) — audio + Whisper dilewati`, true);
    } else {
      pushLog(job, "[sub] tidak ada subtitle VTT yang cukup — pakai Whisper", true);
      const client = await ytdlpFetch(
        [
          "--no-cache-dir", "--no-warnings", "--newline",
          "-f", "bestaudio[ext=m4a]/bestaudio/best",
          "-o", path.join(dir, "audio.%(ext)s"),
        ],
        job.url,
        job.inputs?.cookies,
        (l) => pushLog(job, l),
        (l) => {
          if (l.startsWith("[download]") && ++logTick % 6 !== 0) return;
          pushLog(job, l);
        }
      );
      pushLog(job, "[sumber] audio selesai" + (client === "default" ? "" : ` (client ${client})`));
      for (const f of await fs.readdir(dir)) {
        if (f.startsWith("audio.")) src = path.join(dir, f);
      }
      if (!src) throw new Error("file audio tidak ditemukan setelah unduh");
    }
    setStage(job, "download", "done");

    // ── 2. probe ──────────────────────────────────────────────────────
    curStage = "probe";
    setStage(job, "probe", "run");
    if (!useVtt) {
      const pr = await run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "json", src,
      ]);
      dur = parseFloat(JSON.parse(pr.stdout).format?.duration || "0");
      if (!dur) throw new Error("ffprobe gagal membaca durasi");
    }
    job.sourceSeconds = r1(dur);
    pushLog(job, `[probe] durasi ${r1(dur)}s${useVtt ? " (dari subtitle)" : ""}`, true);
    setStage(job, "probe", "done");

    // ── 3. transkrip (faster-whisper, resident worker + fallback) ─────
    curStage = "transcribe";
    setStage(job, "transcribe", "run");
    if (!useVtt) {
      const wav = path.join(dir, "audio.wav");
      const ax = await run(["ffmpeg", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
      if (ax.code !== 0) throw new Error("ekstrak audio gagal: " + tailErr(ax.stderr));
      const info = await transcribe(wav, dir, (l) => pushLog(job, l));
      segs = info.segments;
      job.lang = info.language;
      const nWords = allWords(segs).length;
      if (!segs.length) pushLog(job, "⚠️ tidak ada ucapan terdeteksi — momen dipilih dari scene", true);
      if (!nWords) pushLog(job, "⚠️ word timestamp kosong — klip dirender tanpa caption", true);
    } else {
      pushLog(job, "[whisper] dilewati — pakai subtitle VTT (tanpa word timestamp, caption kata tidak tersedia)", true);
    }
    setStage(job, "transcribe", "done");

    // ── 4. analisis & pilih momen ─────────────────────────────────────
    curStage = "analyze";
    setStage(job, "analyze", "run");
    // tanpa full video, scene-detect dilewati — LLM + kepadatan ujaran saja
    const cuts: number[] = [];
    pushLog(job, "[scene] dilewati (mode audio-only)", true);
    // LLM dulu (provider dari Pengaturan — Gemini kalau provider=gemini);
    // gagal / tidak valid → fallback ke skor rule-based (kata + scene cut).
    // Setting clipper (skor min, maks klip, durasi) dibaca dari form tool.
    const cs = clipSettings(job.inputs);
    pushLog(job, `[ai] setting: skor min ${cs.minScore} · maks ${cs.maxClips} klip · durasi ${cs.minDur}–${cs.maxDur} dtk`, true);
    // deteksi tipe konten sekali dari seluruh transkrip → prompt LLM disesuaikan
    const ctype = detectContentType(segs).type;
    pushLog(job, `[ai] tipe konten: ${ctype}`, true);
    // gaming saja: ambil sinyal motion (download video low-res + OpenCV);
    // gagal / OpenCV tidak ada → lanjut tanpa sinyal motion
    const motion = ctype === "gaming"
      ? await fetchMotion(job.url, dir, job.inputs?.cookies, (l) => pushLog(job, l))
      : null;
    const proposals = (await pickMomentsLLM(segs, dur, job, cs, ctype, motion)) ?? pickProposals(segs, cuts, dur, cs.maxClips);
    if (!proposals.length) throw new Error("tidak ada kandidat klip yang bisa dibuat");
    const first = segs.find((s) => s.text);
    job.title = (first?.text || `Klip dari ${job.url}`).slice(0, 60);
    pushLog(job,
      `[momen] ${proposals.map((p, i) => `#${i + 1} ${p.start}–${p.end}s (skor ${p.score})`).join(" · ")}`,
      true);
    setStage(job, "analyze", "done");

    // ── 5. render klip 9:16 + caption ────────────────────────────────
    curStage = "render";
    setStage(job, "render", "run");
    const presetId = job.captionPreset || DEFAULT_PRESET;
    pushLog(job, `[render] preset caption: ${presetId}`, true);
    const words = allWords(segs);
    const clips: Clip[] = [];
    for (let i = 0; i < proposals.length; i++) {
      const p = proposals[i];
      const cid = randomUUID().slice(0, 8);
      const file = `klip-${i + 1}-${cid}.mp4`;
      const thumb = `th-${cid}.jpg`;
      // caption karaoke ala klipers.pro: ASS word-level + font asli, dibakar ffmpeg
      let capAss = "";
      if (words.length) {
        capAss = path.join(dir, `cap-${cid}.ass`);
        await fs.writeFile(
          capAss,
          buildAss(words, { presetId, clipStart: p.start, clipEnd: p.end })
        );
      }
      const vf =
        "crop=w='trunc(min(iw,ih*9/16)/2)*2':h=ih,scale=540:960" +
        (capAss
          ? `,subtitles=filename='${capAss}':fontsdir='${FONTS_DIR}'`
          : "");
      const tClip = Date.now();
      // unduh segmen video saja (HLS, ala ClipFlow) — bukan full video
      const segBase = path.join(dir, `seg-${i}`);
      await ytdlpFetch(
        [
          "--no-cache-dir", "--no-warnings", "--newline",
          "-f", "best[protocol=m3u8]/best",
          "--download-sections", `*${p.start}-${p.end}`,
          "--force-keyframes-at-cuts",
          "--no-hls-use-mpegts",
          "--concurrent-fragments", "8",
          "-o", segBase + ".%(ext)s",
        ],
        job.url,
        job.inputs?.cookies,
        (l) => pushLog(job, l)
      );
      let segSrc = "";
      for (const f of await fs.readdir(dir)) {
        if (f.startsWith(`seg-${i}.`)) segSrc = path.join(dir, f);
      }
      if (!segSrc) throw new Error(`segmen ${i + 1} tidak terunduh`);
      // segmen sudah sepanjang klip — render langsung tanpa -ss/-t
      const rr = await run([
        "ffmpeg", "-y", "-i", segSrc,
        "-vf", vf,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart", path.join(dir, file),
      ]);
      if (capAss && process.env.VL_KEEP_ASS !== "1") await fs.rm(capAss, { force: true });
      if (rr.code !== 0) throw new Error("render klip gagal: " + tailErr(rr.stderr));
      await run([
        "ffmpeg", "-y", "-ss", "1", "-i", path.join(dir, file),
        "-frames:v", "1", "-vf", "scale=180:320", path.join(dir, thumb),
      ]);
      const st = await fs.stat(path.join(dir, file));
      clips.push({
        file, thumb,
        start: p.start, end: p.end,
        seconds: r1(p.end - p.start),
        bytes: st.size,
        title: job.title.slice(0, 60) || `Klip ${i + 1}`,
        lines: words.length,
        preset: presetId,
      });
      job.clips = [...clips];
      pushLog(job, `[render] klip ${i + 1}/${proposals.length} jadi dalam ${((Date.now() - tClip) / 1000).toFixed(1)}s · ${(st.size / 1e6).toFixed(2)} MB`, true);
    }
    setStage(job, "render", "done");

    job.status = "done";
    pushLog(job, `✅ selesai · ${stageSummary(job)} · total ${((Date.now() - t0) / 1000).toFixed(1)}s`, true);
    await persist(job);
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    job.error = msg;
    job.status = "fail";
    if (curStage) setStage(job, curStage, "fail");
    pushLog(job, `❌ gagal di tahap ${curStage || "?"} · ${stageSummary(job)} · total ${((Date.now() - t0) / 1000).toFixed(1)}s`, true);
    pushLog(job, "❌ " + msg, true);
    await persist(job);
  }
}
