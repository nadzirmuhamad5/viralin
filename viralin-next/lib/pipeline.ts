import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DATA, jobs, persist, type Clip, type Job, type Stage } from "./store";
import { buildAss, DEFAULT_PRESET, type Word } from "./captions";
import { runTool } from "./toolrun";
import { ytdlpFetch, transcribe, zaiChat, extractJson, type Seg } from "./mediakit";
import { run, tailErr } from "./exec";
import { FONTS_DIR, MAX_SECONDS } from "./config";
import { queueStats } from "./queue";

const STAGES: Array<[string, string]> = [
  ["download", "⬇️ yt-dlp — unduh video"],
  ["probe", "🔎 ffprobe — durasi & metadata"],
  ["transcribe", "🎙️ faster-whisper — transkrip + timestamp"],
  ["analyze", "🧠 pilih momen — density scene + kepadatan ujaran"],
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

/** Deteksi cut scene. Video di-downscale ke 160×90 dulu — skor scene cukup akurat
 *  untuk pemilihan momen, sementara CPU decode turun 20–50× dibanding resolusi penuh. */
async function detectScenes(src: string, dur: number, job: Job): Promise<number[]> {
  const r = await run([
    "ffmpeg", "-hide_banner", "-an", "-i", src,
    "-vf", "scale=160:90,select='gt(scene,0.3)',showinfo", "-f", "null", "-",
  ]);
  const ts = [...r.stderr.matchAll(/pts_time:([0-9.]+)/g)].map((m) => parseFloat(m[1]));
  const out = [...new Set(ts.filter((t) => 0 < t && t < dur))].sort((a, b) => a - b);
  pushLog(job, `[scene] ${out.length} cut terdeteksi`);
  return [0, ...out, dur];
}

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

/** Validasi momen dari LLM: clamp ke durasi, 15-45 dtk, tidak tumpang tindih, maks 3, urut. */
export function sanitizeMoments(
  momen: Array<{ mulai?: number; selesai?: number }>,
  dur: number
): Proposal[] {
  const out: Proposal[] = [];
  for (const m of momen || []) {
    const start = r2(Math.max(0, Number(m.mulai) || 0));
    const end = r2(Math.min(dur, Number(m.selesai) || 0));
    if (end - start < 15 || end - start > 45) continue;
    if (out.some((p) => start < p.end && end > p.start)) continue; // tumpang tindih
    out.push({ start, end, score: 0 });
    if (out.length >= 3) break;
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Pilih momen pakai LLM (provider dari Pengaturan — Gemini kalau provider=gemini).
 *  Gagal / tidak valid → null, pemanggil pakai pickProposals rule-based. */
async function pickMomentsLLM(segs: Seg[], dur: number, job: Job): Promise<Proposal[] | null> {
  const transkrip = segs
    .map((s) => `[${s.start.toFixed(1)}–${s.end.toFixed(1)}s] ${s.text}`)
    .join("\n")
    .slice(0, 5000);
  if (!transkrip) return null;
  try {
    const raw = await zaiChat(
      'Kamu analis konten viral TikTok/Reels Indonesia. Pilih momen terbaik dari transkrip untuk dijadikan klip pendek. Balas HANYA JSON: {"momen":[{"mulai":0,"selesai":30,"alasan":"..."}]}. ' +
        "Maks 3 momen, tiap momen 15-45 detik (ideal ±30 detik), tidak tumpang tindih, dalam durasi video. Prioritaskan hook kuat di awal, momen emosional/energi tinggi, dan kalimat yang utuh (jangan potong di tengah kalimat).",
      `Durasi video: ${Math.round(dur)}s.\nTranskrip ber-timestamp:\n${transkrip}`,
      (l) => pushLog(job, l)
    );
    const j = extractJson<{ momen?: Array<{ mulai?: number; selesai?: number; alasan?: string }> }>(raw);
    const out = sanitizeMoments(j.momen || [], dur);
    if (!out.length) return null;
    pushLog(job, `[ai] momen dipilih LLM: ${out.map((p) => `${p.start}–${p.end}s`).join(" · ")}`, true);
    return out;
  } catch (e) {
    pushLog(job, `[ai] analisis LLM gagal, pakai skor rule-based — ${String((e as Error)?.message || e).slice(0, 120)}`);
    return null;
  }
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
    // ── 1. unduh (yt-dlp, + cookies opsional & fallback client) ───────
    curStage = "download";
    setStage(job, "download", "run");
    logTick = 0;
    const client = await ytdlpFetch(
      [
        "--no-cache-dir", "--no-warnings", "--newline",
        // trik YTSage: sorting resolusi lebih tahan banting daripada -f ketat
        "-S", "res:1080", "-N", "4",
        "--merge-output-format", "mp4",
        "-o", path.join(dir, "source.%(ext)s"),
      ],
      job.url,
      job.inputs?.cookies,
      (l) => pushLog(job, l),
      (l) => {
        if (l.startsWith("[download]") && ++logTick % 6 !== 0) return;
        pushLog(job, l);
      }
    );
    pushLog(job, "[sumber] unduhan selesai" + (client === "default" ? "" : ` (client ${client})`));
    let src = "";
    for (const f of await fs.readdir(dir)) {
      if (f.startsWith("source.")) src = path.join(dir, f);
    }
    if (!src) throw new Error("file sumber tidak ditemukan setelah unduh");
    // kalau bukan mp4 (mis. webm vp9), remux/transcode ringan ke mp4
    if (!src.endsWith(".mp4")) {
      const mp4 = src.replace(/\.\w+$/, ".mp4");
      const rm = await run(["ffmpeg", "-y", "-i", src, "-c", "copy", "-movflags", "+faststart", mp4]);
      if (rm.code !== 0) {
        const tc = await run(["ffmpeg", "-y", "-i", src, "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-c:a", "aac", mp4]);
        if (tc.code !== 0) throw new Error("konversi ke mp4 gagal: " + tailErr(tc.stderr));
      }
      src = mp4;
    }
    setStage(job, "download", "done");

    // ── 2. probe ──────────────────────────────────────────────────────
    curStage = "probe";
    setStage(job, "probe", "run");
    const pr = await run([
      "ffprobe", "-v", "error", "-show_entries", "format=duration",
      "-of", "json", src,
    ]);
    const dur = parseFloat(JSON.parse(pr.stdout).format?.duration || "0");
    if (!dur) throw new Error("ffprobe gagal membaca durasi");
    if (dur > MAX_SECONDS) {
      throw new Error(`video ${Math.round(dur)}s > batas ${MAX_SECONDS}s — demo ini membatasi durasi`);
    }
    job.sourceSeconds = r1(dur);
    pushLog(job, `[probe] durasi ${r1(dur)}s`, true);
    setStage(job, "probe", "done");

    // ── 3. transkrip (faster-whisper, resident worker + fallback) ─────
    curStage = "transcribe";
    setStage(job, "transcribe", "run");
    const wav = path.join(dir, "audio.wav");
    const ax = await run(["ffmpeg", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
    if (ax.code !== 0) throw new Error("ekstrak audio gagal: " + tailErr(ax.stderr));
    const info = await transcribe(wav, dir, (l) => pushLog(job, l));
    const segs: Seg[] = info.segments;
    job.lang = info.language;
    const nWords = allWords(segs).length;
    if (!segs.length) pushLog(job, "⚠️ tidak ada ucapan terdeteksi — momen dipilih dari scene", true);
    if (!nWords) pushLog(job, "⚠️ word timestamp kosong — klip dirender tanpa caption", true);
    setStage(job, "transcribe", "done");

    // ── 4. analisis & pilih momen ─────────────────────────────────────
    curStage = "analyze";
    setStage(job, "analyze", "run");
    const cuts = await detectScenes(src, dur, job);
    // LLM dulu (provider dari Pengaturan — Gemini kalau provider=gemini);
    // gagal / tidak valid → fallback ke skor rule-based (kata + scene cut).
    const proposals = (await pickMomentsLLM(segs, dur, job)) ?? pickProposals(segs, cuts, dur);
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
      const rr = await run([
        "ffmpeg", "-y", "-ss", String(p.start), "-i", src,
        "-t", (p.end - p.start).toFixed(2),
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
