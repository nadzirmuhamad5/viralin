/** Tool "transcript" — whisper → SRT / VTT / TXT siap unduh. */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "../mediakit";
import { toSrt, toVtt, type ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const { src, dur } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
  const wav = await mk.extractAudio(src, dir, Math.min(dur, 900));
  const info = await mk.transcribe(wav, dir, log);
  const srt = toSrt(info.segments);
  const vtt = toVtt(info.segments);
  const txt = info.segments.map((s) => s.text).join(" ");
  await fs.writeFile(path.join(dir, "transkrip.srt"), srt);
  await fs.writeFile(path.join(dir, "transkrip.vtt"), vtt);
  await fs.writeFile(path.join(dir, "transkrip.txt"), txt);
  job.files!.push({ file: "transkrip.srt", label: "Subtitle SRT", kind: "subtitle" });
  job.files!.push({ file: "transkrip.vtt", label: "Subtitle VTT", kind: "subtitle" });
  job.files!.push({ file: "transkrip.txt", label: "Teks polos", kind: "subtitle" });
  job.texts!.push({ label: "Pratinjau transkrip", body: txt.slice(0, 600) + (txt.length > 600 ? "…" : "") });
  job.title = "Transcript AI";
  log(`[transkrip] ${info.segments.length} segmen tersimpan`);
}
