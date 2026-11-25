/** Tool "seamless-loop" — boomerang mulus: klip maju + reverse, concat + fade. */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "../mediakit";
import { run as runCmd, tailErr } from "../exec";
import { clamp, num, thumb, type ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const { src, dur } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
  const start = clamp(num(inputs.start, 0), 0, Math.max(dur - 3, 0));
  const dl = clamp(num(inputs.dur, 6, 3, 15), 3, Math.max(dur - start, 3));
  const fwd = path.join(dir, "fwd.mp4");
  await runCmd(["ffmpeg", "-y", "-hide_banner", "-ss", String(start), "-i", src, "-t", String(dl),
    "-vf", "crop=w='trunc(min(iw,ih*9/16)/2)*2':h=ih,scale=540:960,fps=30", "-an",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", fwd]);
  const out = path.join(dir, "loop.mp4");
  const r = await runCmd(["ffmpeg", "-y", "-hide_banner", "-i", fwd,
    "-filter_complex", "[0:v]split[a][b];[b]reverse[rev];[a][rev]concat=n=2:v=1,fade=t=in:d=0.25,fade=t=out:st=" +
      (dl * 2 - 0.25).toFixed(2) + ":d=0.25[v]",
    "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-movflags", "+faststart", out]);
  if (r.code !== 0) throw new Error("loop gagal: " + tailErr(r.stderr));
  await fs.rm(fwd, { force: true });
  await thumb(dir, out, "th-loop.jpg");
  job.files!.push({ file: "loop.mp4", label: `Loop boomerang ${Math.round(dl * 2)}s`, kind: "video" });
  job.title = "Seamless Loop";
  log("[loop] boomerang jadi");
}
