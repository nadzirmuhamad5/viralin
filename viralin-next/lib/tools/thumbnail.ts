/** Tool "thumbnail" — ambil thumbnail resmi via yt-dlp, fallback frame video. */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "../mediakit";
import { run as runCmd } from "../exec";
import type { ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const base = path.join(dir, "thumb");
  // 1. coba yt-dlp (thumbnail resmi YouTube/TikTok, semua resolusi)
  try {
    await mk.ytdlpFetch(["-q", "--skip-download", "--write-thumbnail", "-o", base],
      inputs.source, inputs.cookies, log);
  } catch (e) {
    // cookies invalid → error jelas; selain itu lanjut fallback frame ffmpeg
    if (String((e as Error).message).includes("cookies tidak ditemukan")) throw e;
  }
  let found = (await fs.readdir(dir)).filter(
    (f) => f.startsWith("thumb") && /\.(jpg|jpeg|png|webp)$/i.test(f)
  );
  // 2. URL file langsung / tanpa metadata thumbnail → fallback: ambil frame video
  if (!found.length) {
    const { src, dur } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
    log("[thumb] URL tanpa thumbnail resmi → ambil frame video via ffmpeg…");
    const stamps = dur > 3 ? [dur * 0.1, dur * 0.5, dur * 0.9] : [0];
    for (let i = 0; i < stamps.length; i++) {
      const out = `thumb-frame-${i + 1}.jpg`;
      const fr = await runCmd(["ffmpeg", "-y", "-hide_banner", "-ss", String(stamps[i]),
        "-i", src, "-frames:v", "1", "-q:v", "3", path.join(dir, out)]);
      if (fr.code !== 0) continue;
      found.push(out);
    }
  }
  if (!found.length) throw new Error("tidak ada thumbnail tersimpan");
  for (const f of found) {
    job.files!.push({
      file: f,
      label: f.startsWith("thumb-frame") ? "Frame video (fallback)" : "Thumbnail",
      kind: "image",
    });
  }
  job.title = "Thumbnail Video";
  log(`[thumb] ${found.length} thumbnail diambil`);
}
