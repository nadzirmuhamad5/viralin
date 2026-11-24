import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DATA, jobs, persist, type Clip, type Job, type Stage } from "./store";
import { buildAss, DEFAULT_PRESET, type Word } from "./captions";
import { runTool } from "./toolrun";
import { ytdlpFetch, ytdlpRun, probeDur, UPLOAD_DIR } from "./mediakit";

const PY = process.env.PYTHON || "python3";
const DEPS = "/home/z/my-project/.deps";
const YTDLP = path.join(DEPS, "bin", "yt-dlp");

/** Opsi storage: upload file hasil ke Google Drive (butuh VL_GDRIVE_* di deploy/env). */
async function simpanKeDrive(job: Job, dir: string, log: (l: string) => void): Promise<void> {
  if ((job.inputs?.simpanDrive || "tidak") !== "ya" || !job.files?.length) return;
  const { gdriveUpload } = await import("./storage-drive");
  for (const f of job.files) {
    log(`[drive] mengunggah ${f.file} ke Google Drive…`);
    try {
      f.link = await gdriveUpload(path.join(dir, f.file), f.file, log);
      log(`[drive] ✓ ${f.file} → ${f.link}`);
    } catch (e) {
      throw new Error(`upload Google Drive gagal (${f.file}): ${(e as Error).message}`);
    }
  }
}
const WORKER = path.join(process.cwd(), "worker", "transcribe.py");
const FONTS_DIR = path.join(process.cwd(), "assets", "caption-fonts");
const WHISPER_MODEL = process.env.VL_WHISPER_MODEL || "small";
const WHISPER_LANG = process.env.VL_WHISPER_LANGUAGE || "id"; // produk fokus Indonesia; auto sering salah deteksi TTS
const MAX_SECONDS = Number(process.env.VL_MAX_SECONDS || 900); // 15 menit
const ENV = {
  ...process.env,
  HF_HOME: "/home/z/my-project/.cache/huggingface",
  PYTHONPATH: DEPS,
};

const STAGES: Array<[string, string]> = [
  ["download", "🔎 analisis penuh — metadata + subtitle (tanpa unduh media)"],
  ["probe", "⏱️ durasi penuh dari metadata"],
  ["transcribe", "🎙️ transkrip — subtitle penuh / whisper audio"],
  ["analyze", "🧠 pilih momen — kepadatan ujaran seluruh video"],
  ["render", "🎬 unduh per-segmen + timing kata + render 9:16"],
];

function run(
  cmd: string[],
  opts: { env?: NodeJS.ProcessEnv; onLine?: (l: string) => void } = {}
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = execFile(
      cmd[0],
      cmd.slice(1),
      { maxBuffer: 64 << 20, timeout: 600_000, env: opts.env ?? process.env },
      (err, stdout, stderr) => {
        if (err && (err as NodeJS.Process & { killed?: boolean }).killed) {
          reject(new Error(`timeout: ${cmd[0]}`));
        } else {
          resolve({
            code: err ? ((err as { code?: number }).code ?? 1) : 0,
            stdout: String(stdout),
            stderr: String(stderr),
          });
        }
      }
    );
    if (opts.onLine) {
      const pump = (d: unknown) =>
        String(d)
          .split(/[\r\n]+/)
          .forEach((l) => l.trim() && opts.onLine!(l));
      p.stdout?.on("data", pump);
      p.stderr?.on("data", pump);
    }
  });
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

function tailErr(s: string): string {
  const lines = s.split(/\r?\n/).filter((l) => l.trim());
  return lines.slice(-3).join(" · ").slice(0, 300) || "(kosong)";
}

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
  return job;
}

function setStage(job: Job, name: string, status: Stage["status"]) {
  const s = job.stages.find((x) => x.name === name);
  if (!s) return;
  s.status = status;
  if (status === "run") s.ms = undefined;
  if (status === "done" || status === "fail") s.ms = Date.now();
}

function pushLog(job: Job, line: string, persistToo = false) {
  job.logs.push(line.slice(0, 240));
  if (job.logs.length > 160) job.logs.splice(0, job.logs.length - 140);
  if (persistToo) void persist(job);
}

async function detectScenes(src: string, dur: number, job: Job): Promise<number[]> {
  const r = await run([
    "ffmpeg", "-hide_banner", "-i", src,
    "-vf", "select='gt(scene,0.3)',showinfo", "-f", "null", "-",
  ]);
  const ts = [...r.stderr.matchAll(/pts_time:([0-9.]+)/g)].map((m) => parseFloat(m[1]));
  const out = [...new Set(ts.filter((t) => 0 < t && t < dur))].sort((a, b) => a - b);
  pushLog(job, `[scene] ${out.length} cut terdeteksi`);
  return [0, ...out, dur];
}

type Seg = { start: number; end: number; text: string; words?: Word[] };
type Proposal = { start: number; end: number; score: number };

function pickProposals(segs: Seg[], cuts: number[], dur: number): Proposal[] {
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
    if (picked.length >= 3) break;
    if (picked.every((p) => c.end <= p.start || c.start >= p.end)) {
      picked.push({ start: c.start, end: c.end, score: c.score });
    }
  }
  if (!picked.length) {
    // fallback: window tunggal awal video / berbasis scene
    if (cuts.length >= 3) {
      for (let i = 0; i < cuts.length - 1 && picked.length < 3; i++) {
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

/** Kumpulkan semua kata ber-timestamp dari segmen whisper (untuk caption karaoke). */
function allWords(segs: Seg[]): Word[] {
  const out: Word[] = [];
  for (const s of segs) {
    if (Array.isArray(s.words) && s.words.length) out.push(...s.words);
  }
  return out;
}

function tsSec(t: string): number {
  const m = t.trim().match(/^(?:(\d+):)?(\d+):(\d+(?:[.,]\d+)?)$/);
  if (!m) return NaN;
  return (m[1] ? Number(m[1]) * 3600 : 0) + Number(m[2]) * 60 + parseFloat(m[3].replace(",", "."));
}

/** Parse VTT/SRT → segmen; buang overlap rolling auto-sub YouTube
 *  (cue baru = ekor cue sebelumnya + kata baru → potong ekornya). */
async function parseSubs(file: string): Promise<Seg[]> {
  const raw = await fs.readFile(file, "utf-8").catch(() => "");
  const lines = raw.split(/\r?\n/);
  const out: Seg[] = [];
  let lastFull = "";
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(
      /(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})/
    );
    if (!m) continue;
    const start = tsSec(m[1]);
    if (!Number.isFinite(start)) continue;
    const end = Math.max(Number.isFinite(tsSec(m[2])) ? tsSec(m[2]) : start + 1, start + 0.5);
    const body: string[] = [];
    for (let j = i + 1; j < lines.length && lines[j].trim() && !lines[j].includes("-->"); j++) {
      if (!/^\d+$/.test(lines[j].trim())) body.push(lines[j].trim());
    }
    const text = body.join(" ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const maxK = Math.min(lastFull.length, text.length - 1);
    let k = 0;
    for (let cand = maxK; cand > 0; cand--) {
      if (lastFull.slice(lastFull.length - cand) === text.slice(0, cand)) { k = cand; break; }
    }
    const newText = text.slice(k).trim();
    lastFull = text;
    if (!newText) continue;
    out.push({ start: r2(start), end: r2(end), text: newText });
  }
  return out;
}

/** Kata sintetis dari baris subtitel dalam window (fallback timing per kata). */
function synthWords(segs: Seg[], start: number, end: number): Word[] {
  const out: Word[] = [];
  for (const s of segs) {
    if (s.end <= start || s.start >= end) continue;
    const ws = s.text.split(/\s+/).filter(Boolean);
    if (!ws.length) continue;
    const a = Math.max(s.start - start, 0);
    const b = Math.min(s.end - start, end - start);
    const step = (b - a) / ws.length;
    ws.forEach((w, k) => out.push({ start: r2(a + k * step), end: r2(a + (k + 1) * step), word: w }));
  }
  return out;
}

export async function runJob(job: Job): Promise<void> {
  job.status = "run";
  await persist(job);
  const dir = path.join(DATA, job.id);
  await fs.mkdir(dir, { recursive: true });
  let curStage = "";
  let logTick = 0;

  // ── jalur tool generik (semua fitur selain klip-ai) ────────────────
  if (job.tool && job.tool !== "klip-ai") {
    try {
      setStage(job, "sumber", "run");
      setStage(job, "proses", "run");
      await runTool(job, dir, (l: string) => pushLog(job, l));
      setStage(job, "sumber", "done");
      setStage(job, "proses", "done");
      curStage = "hasil";
      setStage(job, "hasil", "run");
      await simpanKeDrive(job, dir, (l: string) => pushLog(job, l));
      job.status = "done";
      setStage(job, "hasil", "done");
      pushLog(job, "✅ selesai", true);
      return;
    } catch (e) {
      job.status = "fail";
      job.error = String((e as Error)?.message || e);
      for (const s of job.stages) if (s.status === "run") s.status = "fail";
      pushLog(job, "❌ " + job.error, true);
      await persist(job);
      return;
    }
  }

  try {
    // ── 1. analisis penuh — metadata + SUBTITLE YouTube (tanpa unduh media) ──
    // Subtitel mencakup 100% durasi dan unduhannya cuma puluhan KB;
    // video diunduh per-segmen di tahap render.
    curStage = "download";
    setStage(job, "download", "run");
    let realDur = 0;
    if (job.url && job.url.startsWith("<uploadId>:")) {
      // upload lokal — ffprobe langsung di file, tanpa yt-dlp
      const upId = job.url.slice("<uploadId>:".length).replace(/[^a-zA-Z0-9._-]/g, "");
      realDur = await probeDur(path.join(UPLOAD_DIR, upId));
      job.title = upId.slice(0, 60);
    } else {
      try {
        const meta = await ytdlpRun(
          ["--no-warnings", "--skip-download", "--print", "%(duration)s", "--print", "%(title)s"],
          job.url, job.inputs?.cookies, (l) => pushLog(job, l),
        );
        const metaLines = meta.stdout.trim().split("\n");
        const metaDur = parseFloat(metaLines[0] || "0");
        realDur = Number.isFinite(metaDur) && metaDur > 0 ? metaDur : 0;
        if (metaLines[1]) job.title = metaLines[1].slice(0, 60);
      } catch { /* file media langsung (mp4 dsb) — coba ffprobe di bawah */ }
      if (!realDur) {
        // yt-dlp sering tak membaca durasi mp4 langsung (http.server tanpa Range) → ffprobe
        realDur = await probeDur(job.url).catch(() => 0);
        if (realDur && !job.title) {
          job.title = decodeURIComponent((job.url.split("/").pop() || "").split("?")[0]).slice(0, 60);
        }
      }
    }
    if (!realDur) throw new Error("durasi video tidak diketahui dari metadata");
    job.sourceSeconds = r1(realDur);
    pushLog(job, `[sumber] video ${Math.round(realDur / 60)} menit — analisis dari subtitel (tanpa unduh media)`, true);
    // subtitel: satu bahasa per percobaan (id dulu — fokus produk) — HTTP 429 YouTube
    // sering menghentikan track kedua padahal track pertama sudah tersimpan,
    // jadi cek file yang ada di folder MESKIPUN yt-dlp exit≠0.
    let subsFile = "";
    const pickSubs = async (): Promise<string> => {
      let found = "";
      for (const f of await fs.readdir(dir)) {
        if (/^subs\..*\.(vtt|srt)$/i.test(f)) found = path.join(dir, f);
      }
      return found;
    };
    for (const lang of ["id", "en"]) {
      try {
        await ytdlpFetch(
          ["-q", "--no-warnings", "--skip-download", "--write-subs", "--write-auto-subs",
           "--sub-langs", lang, "--sub-format", "vtt/srt/best",
           "-o", path.join(dir, "subs.%(ext)s")],
          job.url, job.inputs?.cookies, (l) => pushLog(job, l),
        );
      } catch { /* 429 dsb — tetap cek file yang sempat tersimpan */ }
      subsFile = await pickSubs();
      if (subsFile) break;
    }
    setStage(job, "download", "done");

    // ── 2. probe: durasi penuh dari metadata ──────────────────────────
    curStage = "probe";
    setStage(job, "probe", "run");
    let dur = realDur;
    let segs: Seg[] = [];
    if (subsFile) {
      segs = await parseSubs(subsFile);
      const mm = subsFile.match(/\.([a-z]{2}(?:-[\w-]+)?)\.(?:vtt|srt)$/i);
      if (mm) job.lang = mm[1].toLowerCase();
      pushLog(job, `[subtitel] ${segs.length} baris mencakup penuh ${Math.round(dur / 60)} menit`, true);
      if (!segs.length) pushLog(job, "⚠️ subtitel gagal diparse — fallback ke audio");
    }
    setStage(job, "probe", "done");

    // ── 3. transkrip — subtitel penuh ATAU fallback whisper audio window ──
    curStage = "transcribe";
    setStage(job, "transcribe", "run");
    if (!segs.length) {
      // fallback (video tanpa subtitel): audio-only window 15 menit + whisper
      const window = Math.min(dur || MAX_SECONDS, MAX_SECONDS);
      pushLog(job, `[fallback] tanpa subtitel — audio ${Math.round(window / 60)} menit pertama via whisper`, true);
      await ytdlpFetch(
        ["-q", "--no-warnings", "-f", "ba[ext=m4a]/ba/b",
         "--download-sections", `*0-${window}`,
         "-o", path.join(dir, "sumber-audio.%(ext)s")],
        job.url, job.inputs?.cookies, (l) => pushLog(job, l),
      );
      let audio = "";
      for (const f of await fs.readdir(dir)) {
        if (f.startsWith("sumber-audio.")) audio = path.join(dir, f);
      }
      if (!audio) throw new Error("audio sumber tidak ditemukan setelah unduh");
      const pw = await run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "json", audio,
      ]);
      dur = parseFloat(JSON.parse(pw.stdout).format?.duration || "0") || window;
      const wav = path.join(dir, "audio.wav");
      const ax = await run(["ffmpeg", "-y", "-i", audio, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
      if (ax.code !== 0) throw new Error("ekstrak audio gagal: " + tailErr(ax.stderr));
      const tr = await run(
        [PY, WORKER, wav, "--model", WHISPER_MODEL, "--language", WHISPER_LANG, "--threads", "2"],
        { env: ENV, onLine: (l) => l.startsWith("[whisper]") && pushLog(job, l) }
      );
      if (tr.code !== 0) throw new Error("whisper gagal: " + tailErr(tr.stderr));
      const info = JSON.parse(tr.stdout.trim().split("\n").pop() || "{}") as {
        language?: string; segments?: Seg[];
      };
      segs = info.segments || [];
      job.lang = info.language;
      pushLog(job, `[whisper] bahasa=${info.language} · ${segs.length} segmen · ${allWords(segs).length} kata ber-timestamp`, true);
      await fs.rm(wav, { force: true });
      await fs.rm(audio, { force: true });
    } else {
      pushLog(job, "[whisper] analisis dilewati — transkrip penuh sudah dari subtitel (whisper per-segmen di tahap render)");
    }
    setStage(job, "transcribe", "done");
    if (!segs.length) pushLog(job, "⚠️ tidak ada ucapan terdeteksi — momen diambil dari awal video");

    // ── 4. analisis & pilih momen ─────────────────────────────────────
    curStage = "analyze";
    setStage(job, "analyze", "run");
    // tanpa unduh video penuh → scene detection dilewati; pemilihan murni dari kepadatan ujaran
    const cuts: number[] = [];
    pushLog(job, "[scene] dilewati — tanpa unduh video penuh (pemilihan dari kepadatan ujaran)");
    const proposals = pickProposals(segs, cuts, dur);
    if (!proposals.length) throw new Error("tidak ada kandidat klip yang bisa dibuat");
    const first = segs.find((s) => s.text);
    // metadata judul YouTube lebih baik daripada baris transkrip pertama
    if (!job.title || job.title === job.url) {
      job.title = (first?.text || `Klip dari ${job.url}`).slice(0, 60);
    }
    pushLog(job,
      `[momen] ${proposals.map((p, i) => `#${i + 1} ${p.start}–${p.end}s (skor ${p.score})`).join(" · ")}`,
      true);
    setStage(job, "analyze", "done");

    // ── 5. render klip 9:16 + caption ────────────────────────────────
    curStage = "render";
    setStage(job, "render", "run");
    const presetId = job.captionPreset || DEFAULT_PRESET;
    pushLog(job, `[render] preset caption: ${presetId}`, true);
    const clips: Clip[] = [];
    for (let i = 0; i < proposals.length; i++) {
      const p = proposals[i];
      const cid = randomUUID().slice(0, 8);
      const file = `klip-${i + 1}-${cid}.mp4`;
      const thumb = `th-${cid}.jpg`;
      const t0 = Date.now();
      // unduh HANYA segmen momen ini (~beberapa MB) — bukan video penuh
      const segBase = path.join(dir, `seg-${i}.%(ext)s`);
      await ytdlpFetch(
        ["-q", "--no-warnings", "-S", "res:1080", "-N", "4", "--merge-output-format", "mp4",
         "--download-sections", `*${p.start}-${p.end}`, "-o", segBase],
        job.url, job.inputs?.cookies, (l) => pushLog(job, l),
      );
      let seg = "";
      for (const f of await fs.readdir(dir)) {
        if (f.startsWith(`seg-${i}.`)) seg = path.join(dir, f);
      }
      if (!seg) throw new Error(`segmen ${i + 1} gagal diunduh`);
      if (!seg.endsWith(".mp4")) {
        // webm/vp9 → remux ringan ke mp4 (kalau codec tak kompatibel, ffmpeg copy gagal → transcode)
        const mp4 = seg.replace(/\.\w+$/, ".mp4");
        const rmx = await run(["ffmpeg", "-y", "-i", seg, "-c", "copy", "-movflags", "+faststart", mp4]);
        if (rmx.code !== 0) {
          const tc = await run(["ffmpeg", "-y", "-i", seg, "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-c:a", "aac", mp4]);
          if (tc.code !== 0) throw new Error(`konversi segmen ${i + 1} ke mp4 gagal: ` + tailErr(tc.stderr));
        }
        await fs.rm(seg, { force: true });
        seg = mp4;
      }
      // caption karaoke: whisper pada audio segmen (timing kata akurat; segmen kecil = cepat)
      let words: Word[] = [];
      const awav = path.join(dir, `seg-${i}.wav`);
      try {
        const ax2 = await run(["ffmpeg", "-y", "-i", seg, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", awav]);
        if (ax2.code === 0) {
          const tr2 = await run(
            [PY, WORKER, awav, "--model", WHISPER_MODEL, "--language", WHISPER_LANG, "--threads", "2"],
            { env: ENV }
          );
          if (tr2.code === 0) {
            const wi = JSON.parse(tr2.stdout.trim().split("\n").pop() || "{}") as { segments?: Seg[] };
            words = (wi.segments || []).flatMap((s) => s.words || []);
          }
        }
      } catch { /* tanpa whisper → fallback subtitel di bawah */ }
      await fs.rm(awav, { force: true });
      if (!words.length && segs.length) {
        words = synthWords(segs, p.start, p.end);
        if (words.length) pushLog(job, "[caption] timing kata dari subtitel (whisper segmen kosong)");
      }
      // caption karaoke ala klipers.pro: ASS word-level + font asli, dibakar ffmpeg
      let capAss = "";
      if (words.length) {
        capAss = path.join(dir, `cap-${cid}.ass`);
        await fs.writeFile(
          capAss,
          buildAss(words, { presetId, clipStart: 0, clipEnd: p.end - p.start })
        );
      }
      const vf =
        "crop=w='trunc(min(iw,ih*9/16)/2)*2':h=ih,scale=540:960" +
        (capAss
          ? `,subtitles=filename='${capAss}':fontsdir='${FONTS_DIR}'`
          : "");
      const rr = await run([
        "ffmpeg", "-y", "-i", seg,
        "-t", (p.end - p.start).toFixed(2),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart", path.join(dir, file),
      ]);
      await fs.rm(seg, { force: true }); // hemat disk — segmen mentah tidak disimpan
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
      pushLog(job, `[render] klip ${i + 1}/${proposals.length} jadi dalam ${((Date.now() - t0) / 1000).toFixed(1)}s · ${(st.size / 1e6).toFixed(2)} MB`, true);
    }
    setStage(job, "render", "done");

    await simpanKeDrive(job, dir, (l: string) => pushLog(job, l));
    job.status = "done";
    await persist(job);
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    job.error = msg;
    job.status = "fail";
    if (curStage) setStage(job, curStage, "fail");
    pushLog(job, "❌ " + msg, true);
    await persist(job);
  }
}
