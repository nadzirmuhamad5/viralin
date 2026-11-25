/** Tool "atur-manual" — potong segmen mulai–selesai pilihan user,
 *  caption karaoke gaya klipers tetap dibakar. */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "../mediakit";
import type { Word } from "../captions";
import { clamp, num, thumb, type ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const { src, dur } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
  const start = clamp(num(inputs.start, 0), 0, Math.max(dur - 5, 0));
  const end = clamp(num(inputs.end, Math.min(start + 30, dur)), start + 3, dur);
  log(`[manual] ${start}s → ${end}s (${Math.round(end - start)}s)`);
  const wav = await mk.extractAudio(src, dir);
  const info = await mk.transcribe(wav, dir, log);
  const words: Word[] = info.segments.flatMap((s) => s.words || []);
  const presetId = inputs.preset || job.captionPreset || "bold-impact";
  const out = path.join(dir, "klip-manual.mp4");
  await mk.renderKlip({ src, out, start, end, words, presetId });
  await thumb(dir, out, "th-manual.jpg");
  const st = await fs.stat(out);
  job.clips.push({ file: "klip-manual.mp4", thumb: "th-manual.jpg", start, end,
    seconds: Math.round((end - start) * 10) / 10, bytes: st.size,
    title: `Manual ${start}s–${end}s`, lines: words.length, preset: presetId });
  job.title = `Atur Manual — ${start}s→${end}s`;
  log(`[manual] klip jadi (${(st.size / 1e6).toFixed(2)} MB)`);
}
