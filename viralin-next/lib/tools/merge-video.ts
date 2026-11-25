/** Tool "merge-video" — gabung maks 4 URL video jadi satu 9:16.
 *  Perbaikan (A): URL identik hanya diunduh SEKALI (cache per-URL) lalu path
 *  sumbernya dipakai ulang untuk render tiap segmen — unduhan tidak berulang. */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "../mediakit";
import { run as runCmd, tailErr } from "../exec";
import { num, type ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const urls = (inputs.sources || "").split(/\n+/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s)).slice(0, 4);
  if (urls.length < 2) throw new Error("butuh minimal 2 URL video (satu per baris)");
  const perdur = num(inputs.perdur, 15, 5, 60);
  // cache URL → path sumber hasil unduhan; segmen dengan URL sama pakai ulang path ini
  const cache = new Map<string, string>();
  const segs: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const cached = cache.get(urls[i]);
    log(`[merge] sumber ${i + 1}/${urls.length}…${cached ? " (cache)" : ""}`);
    let src: string;
    if (cached) {
      src = cached;
    } else {
      const sub = path.join(dir, `in-${i}`);
      src = (await mk.getSource(urls[i], sub, log, inputs.cookies)).src;
      cache.set(urls[i], src);
    }
    const seg = path.join(dir, `seg-${i}.mp4`);
    const r = await runCmd(["ffmpeg", "-y", "-hide_banner", "-i", src, "-t", String(perdur),
      "-vf", "crop=w='trunc(min(iw,ih*9/16)/2)*2':h=ih,scale=540:960,fps=30",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", seg]);
    if (r.code !== 0) throw new Error(`segmen ${i + 1} gagal: ${tailErr(r.stderr)}`);
    segs.push(seg);
  }
  const list = path.join(dir, "list.txt");
  await fs.writeFile(list, segs.map((s) => `file '${s}'`).join("\n"));
  const out = path.join(dir, "merge.mp4");
  const r2 = await runCmd(["ffmpeg", "-y", "-hide_banner", "-f", "concat", "-safe", "0", "-i", list,
    "-c", "copy", "-movflags", "+faststart", out]);
  if (r2.code !== 0) throw new Error("concat gagal: " + tailErr(r2.stderr));
  for (const s of segs) await fs.rm(s, { force: true });
  const st = await fs.stat(out);
  job.files!.push({ file: "merge.mp4", label: `Hasil merge ${urls.length} video`, kind: "video" });
  job.title = `Merge ${urls.length} video`;
  log(`[merge] jadi (${(st.size / 1e6).toFixed(2)} MB)`);
}
