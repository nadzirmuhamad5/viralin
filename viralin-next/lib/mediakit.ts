/** Kotak peralatan media bersama: sumber video, whisper, TTS, render klip, LLM & gambar gratis. */
import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { run, tailErr } from "./exec";
import { buildAss, type Word } from "./captions";

export const PY = process.env.PYTHON || "python3";
export const DEPS = "/home/z/my-project/.deps";
export const YTDLP = path.join(DEPS, "bin", "yt-dlp");
export const ENV = {
  ...process.env,
  HF_HOME: "/home/z/my-project/.cache/huggingface",
  PYTHONPATH: DEPS,
};
export const WHISPER_MODEL = process.env.VL_WHISPER_MODEL || "small";
export const WHISPER_LANG = process.env.VL_WHISPER_LANGUAGE || "id";
export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
export const FONTS_DIR = path.join(process.cwd(), "assets", "caption-fonts");

export type Seg = { start: number; end: number; text: string; words?: Word[] };

/** Resolve cookies user → argumen --cookies yt-dlp.
 *  Dua bentuk: upload id file, ATAU paste mentah isi cookies.txt (mengandung baris baru). */
async function cookieArgs(
  cookies: string | undefined,
  log: (l: string) => void
): Promise<string[]> {
  if (!cookies) return [];
  let p: string;
  if (cookies.includes("\n")) {
    // paste mentah → simpan sebagai file; nama stabil dari hash isinya (hindari duplikat)
    const name =
      "paste-" + createHash("sha1").update(cookies).digest("hex").slice(0, 12) + ".txt";
    p = path.join(UPLOAD_DIR, name);
    await fs.mkdir(UPLOAD_DIR, { recursive: true }); // data/ bisa terhapus (recycle/reset) — jangan biarkan writeFile ENOENT
    await fs.writeFile(p, cookies.replace(/\r/g, ""), "utf-8");
    log("[cookies] pakai cookies paste user");
  } else {
    const id = cookies.replace(/[^a-zA-Z0-9._-]/g, "");
    p = path.join(UPLOAD_DIR, id);
    if (!(await fs.stat(p).then(() => true).catch(() => false))) {
      throw new Error("file cookies tidak ditemukan — unggah ulang cookies.txt di form");
    }
    log("[cookies] pakai cookies.txt upload user");
  }
  return ["--cookies", p];
}

const BOT_RE =
  /sign in to confirm|not a bot|age.restrict|members-only|geo-?restrict|unavailable|private video|429|too many requests/i;

/** yt-dlp dengan cookies opsional + fallback client YouTube (anti bot-check).
 *  args: flag khusus pemanggil (mis. ["-q","-o",src]); URL ditambahkan di akhir.
 *  Return label client yang berhasil. */
export async function ytdlpFetch(
  args: string[],
  url: string,
  cookies: string | undefined,
  log: (l: string) => void,
  onLine?: (l: string) => void
): Promise<string> {
  const ck = await cookieArgs(cookies, log);
  // proxy opsional (residential) — YouTube memblokir stream dari IP data center
  const px = process.env.VL_PROXY ? ["--proxy", process.env.VL_PROXY] : [];
  // PYTHONPATH=.deps → yt-dlp menemukan plugin PO-token (bgutil) + pot server di :4416
  const env = { ...process.env, PYTHONPATH: DEPS };
  const tries: string[][] = [
    [...px, ...ck],
    [...px, ...ck, "--extractor-args", "youtube:player_client=tv"],
    [...px, ...ck, "--extractor-args", "youtube:player_client=tv,android"],
    // trik YTSage: client embedded sering lolos untuk video yang bisa di-embed (tanpa cookies)
    [...px, "--extractor-args", "youtube:player_client=web_embedded,default"],
  ];
  let last = "";
  for (let i = 0; i < tries.length; i++) {
    const r = await run([YTDLP, "--no-playlist", ...tries[i], ...args, url], { onLine, env });
    last = r.stderr;
    if (r.code === 0) return i === 0 ? "default" : "youtube:" + tries[i][tries[i].length - 1];
    if (!BOT_RE.test(r.stderr)) break; // error bukan batasan akses — jangan diulang
    if (i < tries.length - 1) {
      log(`[sumber] YouTube menolak akses (bot-check) → coba varian client ${i + 2}/${tries.length}…`);
    }
  }
  throw new Error(
    "unduh gagal (yt-dlp): " + tailErr(last) +
    " — YouTube/TikTok sering minta verifikasi dari IP data center. " +
    "Solusi: pakai URL file .mp4 langsung, ATAU unggah cookies.txt di form (bagian Cookies). " +
    "Kalau tetap tak ada stream (blokir level IP data center): nyalakan server dengan proxy residential — VL_PROXY=http://user:pass@host:port"
  );
}

/** Ambil sumber: unduh via yt-dlp, atau salin dari hasil upload (<uploadId>:nama). */
export async function getSource(
  ref: string,
  dir: string,
  log: (l: string) => void,
  cookies?: string
): Promise<{ src: string; dur: number; title: string }> {
  await fs.mkdir(dir, { recursive: true });
  let src: string;
  let title = ref;
  if (ref.startsWith("<uploadId>:")) {
    const upId = ref.slice("<uploadId>:".length).replace(/[^a-zA-Z0-9._-]/g, "");
    const from = path.join(UPLOAD_DIR, upId);
    src = path.join(dir, "source" + path.extname(upId) || ".mp4");
    await fs.copyFile(from, src);
    title = upId;
    log(`[sumber] pakai upload ${upId}`);
  } else {
    if (!/^https?:\/\//i.test(ref)) throw new Error("sumber harus URL http(s) atau upload");
    src = path.join(dir, "source.mp4");
    log("[sumber] mengunduh via yt-dlp…");
    try {
      const client = await ytdlpFetch(["-q", "--max-filesize", "500M", "-o", src], ref, cookies, log);
      log("[sumber] unduhan selesai" + (client === "default" ? "" : ` (client ${client})`));
    } catch (e) {
      // toleransi lama: yt-dlp exit≠0 tapi file utuh sudah ada → lanjut
      if (!(await fs.stat(src).then(() => true).catch(() => false))) throw e;
      log("[sumber] warning yt-dlp diabaikan — file sudah tersimpan");
    }
  }
  const dur = await probeDur(src);
  return { src, dur, title };
}

export async function probeDur(src: string): Promise<number> {
  const r = await run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", src,
  ]);
  return parseFloat(r.stdout) || 0;
}

export async function extractAudio(src: string, dir: string, seconds?: number): Promise<string> {
  const wav = path.join(dir, "audio.wav");
  const args = ["-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000"];
  if (seconds) args.push("-t", String(seconds));
  args.push(wav);
  const r = await run(["ffmpeg", ...args]);
  if (r.code !== 0) throw new Error("ekstrak audio gagal: " + tailErr(r.stderr));
  return wav;
}

/** Transkripsi whisper → segmen + kata ber-timestamp. */
export async function transcribe(
  wav: string,
  dir: string,
  log: (l: string) => void
): Promise<{ lang: string; duration: number; segments: Seg[] }> {
  const worker = path.join(process.cwd(), "worker", "transcribe.py");
  log(`[whisper] memuat model ${WHISPER_MODEL} & transkripsi…`);
  const r = await run([
    PY, worker, wav, "--model", WHISPER_MODEL, "--language", WHISPER_LANG, "--threads", "2",
  ], { env: ENV, timeout: 900_000 });
  if (r.code !== 0) throw new Error("whisper gagal: " + tailErr(r.stderr));
  const info = JSON.parse(r.stdout) as { language: string; duration: number; segments: Seg[] };
  const nWords = info.segments.reduce((a, s) => a + (s.words?.length ?? 0), 0);
  log(`[whisper] bahasa=${info.language} · ${info.segments.length} segmen · ${nWords} kata`);
  return info;
}

/** Sintesis TTS (edge-tts) → file audio. */
export async function ttsSynth(
  text: string,
  voice: string,
  out: string,
  rate = "+0%",
  log: (l: string) => void
): Promise<void> {
  const txtFile = out + ".txt";
  await fs.writeFile(txtFile, text, "utf8");
  const worker = path.join(process.cwd(), "worker", "tts.py");
  log(`[tts] ${voice} · ${text.length} karakter…`);
  const r = await run([PY, worker, "--voice", voice, "--text-file", txtFile, "--out", out, "--rate", rate], {
    env: ENV, timeout: 300_000,
  });
  await fs.rm(txtFile, { force: true });
  if (r.code !== 0) throw new Error("edge-tts gagal: " + tailErr(r.stderr));
}

/** Render klip 9:16 + caption karaoke ala klipers (dipakai klip-ai & atur-manual & konten). */
export async function renderKlip(opts: {
  src: string; out: string; start: number; end: number;
  words?: Word[]; presetId: string; vertical?: boolean; positionY?: number;
}): Promise<void> {
  const vf =
    (opts.vertical !== false ? "crop=w='trunc(min(iw,ih*9/16)/2)*2':h=ih," : "") +
    "scale=540:960" +
    (opts.words?.length
      ? `,subtitles=filename='${await writeAss(opts, process.cwd())}':fontsdir='${FONTS_DIR}'`
      : "");
  const r = await run([
    "ffmpeg", "-y", "-hide_banner", "-ss", String(opts.start), "-i", opts.src,
    "-t", String(Math.max(opts.end - opts.start, 1)),
    "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", opts.out,
  ]);
  if (r.code !== 0) throw new Error("render gagal: " + tailErr(r.stderr));
}

async function writeAss(
  opts: { words: Word[]; start: number; end: number; presetId: string; positionY?: number },
  dir: string
): Promise<string> {
  const assPath = path.join(dir, "data", "tmp-ass-" + Math.random().toString(36).slice(2, 8) + ".ass");
  await fs.writeFile(
    assPath,
    buildAss(opts.words, {
      presetId: opts.presetId,
      clipStart: opts.start,
      clipEnd: opts.end,
      positionY: opts.positionY,
    })
  );
  setTimeout(() => void fs.rm(assPath, { force: true }), 60_000);
  return assPath;
}

/* ── AI gratis via CLI z-ai (chat GLM, image gen) ─────────────────────── */

export async function zaiChat(system: string, prompt: string, log?: (l: string) => void): Promise<string> {
  const out = path.join("/tmp", "vl-llm-" + Math.random().toString(36).slice(2, 8) + ".json");
  log?.("[ai] memanggil LLM gratis (z-ai)…");
  const r = await run(["z-ai", "chat", "-p", prompt, ...(system ? ["-s", system] : []), "-o", out], {
    timeout: 240_000,
  });
  if (r.code !== 0) throw new Error("z-ai chat gagal: " + tailErr(r.stderr));
  const raw = await fs.readFile(out, "utf8");
  await fs.rm(out, { force: true });
  const j = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
  return (j.choices?.[0]?.message?.content || "").trim();
}

/** Ambil objek JSON dari balasan LLM (tahan markdown fence). */
export function extractJson<T>(s: string): T {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(s);
  const body = (fenced ? fenced[1] : s).trim();
  const start = body.search(/[[{]/);
  const cand = start >= 0 ? body.slice(start) : body;
  try {
    return JSON.parse(cand) as T;
  } catch {
    // potong di bracket penutup terakhir
    const lastBrace = Math.max(cand.lastIndexOf("}"), cand.lastIndexOf("]"));
    return JSON.parse(cand.slice(0, lastBrace + 1)) as T;
  }
}

export async function zaiImage(prompt: string, out: string, log?: (l: string) => void): Promise<void> {
  log?.("[ai] membuat gambar (z-ai image)…");
  const r = await run(["z-ai", "image", "-p", prompt, "-o", out], { timeout: 240_000 });
  if (r.code !== 0 || !(await fs.stat(out).then(() => true).catch(() => false))) {
    throw new Error("z-ai image gagal: " + tailErr(r.stderr));
  }
}
