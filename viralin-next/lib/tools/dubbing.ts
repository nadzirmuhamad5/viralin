/** Tool "dubbing" — ganti suara video: whisper → edge-tts paralel → amix → mux.
 *  Perbaikan (B): sintesis edge-tts jalan paralel (pool kecil konkur 4) — dulu
 *  sekuensial hingga 60 panggilan jaringan. Nama file `dub-<i>.mp3` tetap,
 *  drift dihitung SETELAH semua synth (probeDur per segmen), urutan amix tetap. */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "../mediakit";
import { run as runCmd, tailErr } from "../exec";
import { clamp, num, thumb, type ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const { src, dur } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
  const cap = clamp(num(inputs.dur, 45, 10, 120), 10, Math.min(dur, 120));
  const wav = await mk.extractAudio(src, dir, cap);
  const info = await mk.transcribe(wav, dir, log);
  const segs = info.segments.slice(0, 60);
  log(`[dubbing] ${segs.length} segmen → disuarakan ulang ${inputs.voice}…`);
  const voice = inputs.voice || "id-ID-GadisNeural";
  // pool kecil: 4 worker mengambil indeks segmen berikutnya (urutan file tetap i)
  let next = 0;
  const workerCount = Math.min(4, segs.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (next < segs.length) {
      const i = next++;
      const mp3 = path.join(dir, `dub-${i}.mp3`);
      await mk.ttsSynth(segs[i].text, voice, mp3, "+10%", log);
    }
  }));
  // drift dihitung per segmen SETELAH semua synth selesai; urutan amix mengikuti segmen
  const args: string[] = ["-y", "-hide_banner"];
  let drift = 0;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const mp3 = path.join(dir, `dub-${i}.mp3`);
    const sd = await mk.probeDur(mp3);
    drift += Math.max(0, sd - (s.end - s.start));
    args.push("-itsoffset", String(Math.max(s.start, 0)), "-i", mp3);
  }
  if (!segs.length) throw new Error("tidak ada ucapan untuk di-dubbing");
  const dub = path.join(dir, "dub-audio.m4a");
  args.push("-filter_complex", `amix=inputs=${segs.length}:normalize=0:duration=longest[a]`,
    "-map", "[a]", "-c:a", "aac", "-b:a", "160k", dub);
  const rm = await runCmd(["ffmpeg", ...args]);
  for (let i = 0; i < segs.length; i++) await fs.rm(path.join(dir, `dub-${i}.mp3`), { force: true });
  if (rm.code !== 0) throw new Error("mix audio gagal: " + tailErr(rm.stderr));
  const out = path.join(dir, "dubbed.mp4");
  const r2 = await runCmd(["ffmpeg", "-y", "-hide_banner", "-t", String(cap), "-i", src, "-i", dub,
    "-map", "0:v", "-map", "1:a",
    "-vf", "crop=w='trunc(min(iw,ih*9/16)/2)*2':h=ih,scale=540:960",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-shortest",
    "-movflags", "+faststart", out]);
  if (r2.code !== 0) throw new Error("mux dubbing gagal: " + tailErr(r2.stderr));
  const st = await fs.stat(out);
  await thumb(dir, out, "th-dub.jpg");
  job.clips.push({ file: "dubbed.mp4", thumb: "th-dub.jpg", start: 0, end: cap,
    seconds: Math.round(cap * 10) / 10, bytes: st.size,
    title: "Dubbing " + (inputs.voice || ""), lines: segs.length });
  job.texts!.push({ label: "Drift timing", body: `total drift suara baru vs asli: ±${drift.toFixed(1)}s (edge-tts tanpa alignment kata)` });
  job.title = "Voice Dubbing";
  log(`[dubbing] jadi (drift ±${drift.toFixed(1)}s)`);
}
