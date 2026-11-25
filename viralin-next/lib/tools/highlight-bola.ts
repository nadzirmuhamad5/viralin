/** Tool "highlight-bola" — deteksi ledakan energi audio → klip highlight 16:9
 *  + scoreboard opsional.
 *  Perbaikan (E): sanitasi drawtext kini juga membuang `%` (drawtext expansion),
 *  `"` dan backtick/`$` — dulu hanya `'`, `:`, `\`. */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "../mediakit";
import { run as runCmd, tailErr } from "../exec";
import { clamp, num, type ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const { src, dur } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
  const capDur = Math.min(dur, 600);
  const wav = await mk.extractAudio(src, dir, capDur);
  const count = clamp(num(inputs.count, 3, 1, 6), 1, 6);
  const seglen = clamp(num(inputs.seglen, 12, 6, 30), 6, 30);
  log("[bola] mencari ledakan energi audio…");
  const sp = path.join(process.cwd(), "worker", "sports.py");
  const r = await runCmd([mk.PY, sp, wav, "--count", String(count), "--seglen", String(seglen)],
    { env: mk.ENV });
  if (r.code !== 0) throw new Error("analisis energi gagal: " + tailErr(r.stderr));
  const peaks = JSON.parse(r.stdout) as Array<{ start: number; end: number; score: number }>;
  if (!peaks.length) throw new Error("tidak ada puncak audio terdeteksi");
  log(`[bola] ${peaks.length} momen: ` + peaks.map((p) => `${p.start}s(x${p.score})`).join(", "));
  const sb = (inputs.scoreboard || "").trim();
  // buang semua karakter yang merusak filter drawtext: quote, titik dua, backslash,
  // % (expansion drawtext), backtick & $ (expansion shell/drawtext)
  const sbSafe = sb.replace(/['":\\%`$]/g, "");
  for (let i = 0; i < peaks.length; i++) {
    const p = peaks[i];
    const out = path.join(dir, `highlight-${i + 1}.mp4`);
    const vf = "scale=960:540:force_original_aspect_ratio=increase,crop=960:540,fps=30" +
      (sb ? `,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${sbSafe}':fontsize=40:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=12:x=(w-text_w)/2:y=28` : "");
    const rr = await runCmd(["ffmpeg", "-y", "-hide_banner", "-ss", String(p.start), "-i", src,
      "-t", String(seglen), "-vf", vf,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart", out]);
    if (rr.code !== 0) { log(`⚠️ klip ${i + 1} gagal: ${tailErr(rr.stderr)}`); continue; }
    const st = await fs.stat(out);
    job.clips.push({ file: `highlight-${i + 1}.mp4`, thumb: "", start: p.start,
      end: p.start + seglen, seconds: seglen, bytes: st.size,
      title: sb || `Highlight ${i + 1} (skor ${p.score})`, lines: 0 });
  }
  job.title = `Highlight Bola — ${peaks.length} momen`;
}
