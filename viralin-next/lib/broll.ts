/** B-Roll video untuk konten-tempel (faceless) — pola ClipFlow faceless_engine.py.
 *  Sumber: YouTube (yt-dlp search + download segmen HLS, tanpa cookies) dan
 *  Pexels API (butuh PEXELS_API_KEY). Cache file sederhana di data/broll/,
 *  TTL 7 hari, keyed by hash(keyword|sumber). Semua fungsi tahan gagal:
 *  gagal → null, pemanggil fallback ke gambar AI. */
import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { run } from "./exec";
import { YTDLP, DEPS } from "./config";
import { ytdlpFetch, zaiChat, downloadTo } from "./mediakit";

export type BrollSource = "yt" | "pexels" | "auto";
type Log = (l: string) => void;

const TTL_MS = 7 * 24 * 3600 * 1000; // 7 hari, ala BrollCache ClipFlow
const MIN_BYTES = 100_000; // file < 100 KB dianggap gagal
const SEG_SECONDS = 10; // segmen B-Roll yang diambil dari awal video

/** Key cache deterministik dari keyword + sumber. */
export function brollCacheKey(keyword: string, source: BrollSource): string {
  return createHash("sha256").update(`${keyword.toLowerCase().trim()}|${source}`).digest("hex").slice(0, 16);
}

export function brollCacheFile(keyword: string, source: BrollSource): string {
  return path.join(process.cwd(), "data", "broll", `broll_${brollCacheKey(keyword, source)}.mp4`);
}

/** Ambil URL video dari hasil yt-dlp --dump-single-json (ytsearch). */
export function pickSearchVideoUrls(data: { entries?: Array<{ id?: string }> }): string[] {
  const out: string[] = [];
  for (const e of data?.entries || []) {
    const id = String(e?.id || "");
    if (/^[A-Za-z0-9_-]{11}$/.test(id)) out.push(`https://www.youtube.com/watch?v=${id}`);
    if (out.length >= 3) break;
  }
  return out;
}

/** Pilih file video Pexels: mp4 portrait (height>=720) dengan area terkecil — cukup buat background. */
export function pickPexelsFile(files: Array<{ link?: string; width?: number; height?: number }>): string {
  const mp4 = (files || [])
    .map((f) => ({ link: String(f?.link || ""), w: Number(f?.width) || 0, h: Number(f?.height) || 0 }))
    .filter((f) => /\.mp4(\?|$)/i.test(f.link) && f.h > 0);
  if (!mp4.length) return "";
  const hd = mp4.filter((f) => f.h >= 720).sort((a, b) => a.w * a.h - b.w * b.h);
  return (hd[0] || mp4[0]).link;
}

async function findBrollFile(dir: string, base: string): Promise<string | null> {
  for (const f of await fs.readdir(dir).catch(() => [] as string[])) {
    if (!f.startsWith(base + ".")) continue;
    const p = path.join(dir, f);
    const st = await fs.stat(p).catch(() => null);
    if (st && st.size > MIN_BYTES) return p;
  }
  return null;
}

/** YouTube: cari video, unduh segmen awal (HLS, pola yang sama dengan pipeline.ts). */
async function fetchBrollYouTube(keyword: string, outBase: string, dir: string, log: Log): Promise<string | null> {
  try {
    const s = await run(
      [YTDLP, "--no-playlist", "--dump-single-json", "--no-download", "--no-warnings",
        "--playlist-end", "3", `ytsearch3:${keyword}`],
      { env: { ...process.env, PYTHONPATH: DEPS }, timeout: 60_000 }
    );
    if (s.code !== 0) { log("[broll] YouTube: pencarian gagal"); return null; }
    const urls = pickSearchVideoUrls(JSON.parse(s.stdout));
    if (!urls.length) { log("[broll] YouTube: tidak ada hasil"); return null; }
    for (const url of urls) {
      try {
        await ytdlpFetch(
          ["--no-cache-dir", "--no-warnings", "--newline",
            "-f", "best[protocol=m3u8]/best",
            "--download-sections", `*0-${SEG_SECONDS}`,
            "--force-keyframes-at-cuts", "--no-hls-use-mpegts", "--concurrent-fragments", "8",
            "-o", outBase + ".%(ext)s"],
          url, undefined, log
        );
        const found = await findBrollFile(dir, path.basename(outBase));
        if (found) return found;
      } catch (e) {
        log(`[broll] YouTube: unduh gagal (${String((e as Error)?.message || e).slice(0, 100)})`);
      }
    }
    return null;
  } catch (e) {
    log(`[broll] YouTube: ${String((e as Error)?.message || e).slice(0, 120)}`);
    return null;
  }
}

/** Pexels: cari video stock portrait, unduh file-nya. Tanpa PEXELS_API_KEY → skip. */
async function fetchBrollPexels(keyword: string, out: string, log: Log): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY || "";
  if (!key) { log("[broll] Pexels: tidak ada PEXELS_API_KEY, dilewati"); return null; }
  try {
    const u = `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}&orientation=portrait&size=medium&per_page=3`;
    const r = await fetch(u, { headers: { Authorization: key }, signal: AbortSignal.timeout(30_000) });
    if (!r.ok) { log(`[broll] Pexels: API HTTP ${r.status}`); return null; }
    const j = await r.json() as { videos?: Array<{ video_files?: Array<{ link?: string; width?: number; height?: number }> }> };
    const link = pickPexelsFile(j.videos?.[0]?.video_files || []);
    if (!link) { log("[broll] Pexels: tidak ada video"); return null; }
    await downloadTo(link, out);
    const st = await fs.stat(out).catch(() => null);
    if (!st || st.size < MIN_BYTES) return null;
    return out;
  } catch (e) {
    log(`[broll] Pexels: ${String((e as Error)?.message || e).slice(0, 120)}`);
    return null;
  }
}

/** Ekstrak 1 keyword visual (Inggris) dari naskah via LLM; gagal → pakai topik/naskah langsung. */
export async function extractBrollKeyword(naskah: string, topik: string, log: Log): Promise<string> {
  try {
    const raw = await zaiChat(
      "Kamu spesialis keyword B-Roll untuk video faceless. Balas HANYA 1 keyword pencarian YouTube (bahasa Inggris, 3-8 kata, maks 60 karakter) yang paling cocok sebagai footage latar untuk naskah ini. Fokus ke objek/tempat/fenomena visual yang konkret, bukan orang/wajah. Tanpa penjelasan, tanpa tanda kutip.",
      `Naskah: ${naskah.slice(0, 600)}`,
      log
    );
    const kw = raw.replace(/["'`\n\r]/g, " ").trim().replace(/\s+/g, " ").slice(0, 60);
    if (kw.split(" ").length >= 2) return kw;
  } catch {
    // jatuh ke fallback di bawah
  }
  const fb = (topik || naskah).replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).slice(0, 6).join(" ");
  return fb || "cinematic b-roll footage";
}

/** Titik masuk utama: coba sumber sesuai mode, pakai cache kalau masih segar. */
export async function fetchBroll(
  keyword: string, dir: string, log: Log, source: BrollSource = "auto"
): Promise<string | null> {
  const kw = keyword.trim();
  if (!kw) return null;
  const cacheFile = brollCacheFile(kw, source);
  try {
    const st = await fs.stat(cacheFile);
    if (st.size > MIN_BYTES && Date.now() - st.mtimeMs < TTL_MS) {
      log("[broll] pakai cache");
      return cacheFile;
    }
  } catch { /* miss → fetch */ }
  const outBase = path.join(dir, "broll");
  let got: string | null = null;
  if (source === "yt" || source === "auto") {
    got = await fetchBrollYouTube(kw, outBase, dir, log);
  }
  if (!got && (source === "pexels" || source === "auto")) {
    got = await fetchBrollPexels(kw, outBase + ".mp4", log);
  }
  if (got) {
    // simpan ke cache buat lain kali (best-effort, gagal diabaikan)
    try {
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.copyFile(got, cacheFile);
    } catch { /* abaikan */ }
  }
  return got;
}
