/** Tool "wa-story-hd" — konversi ke 720×1280 HD + audio loudnorm. */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "../mediakit";
import { run as runCmd, tailErr } from "../exec";
import { clamp, num, type ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const { src, dur } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
  const start = clamp(num(inputs.start, 0), 0, Math.max(dur - 3, 0));
  const dl = inputs.dur ? clamp(num(inputs.dur, dur, 3, 300), 3, dur - start) : undefined;
  const out = path.join(dir, "wa-story-hd.mp4");
  const r = await runCmd(["ffmpeg", "-y", "-hide_banner", "-ss", String(start), "-i", src,
    ...(dl ? ["-t", String(dl)] : []),
    "-vf", "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280",
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart", out]);
  if (r.code !== 0) throw new Error("WA Story gagal: " + tailErr(r.stderr));
  const st = await fs.stat(out);
  job.files!.push({ file: "wa-story-hd.mp4", label: "Story 720×1280 HD + loudnorm", kind: "video" });
  job.title = "WA Story HD";
  log(`[wa] jadi (${(st.size / 1e6).toFixed(2)} MB)`);
}
