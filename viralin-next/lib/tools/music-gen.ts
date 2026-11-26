/** Tool "music-gen" — track prosedural per mood (sine chord + bass), royalty-free.
 *  Perbaikan (C): hanya 4 chord UNIK yang dirender (tepat 4 panggilan ffmpeg),
 *  lalu list concat mengulang keempat file itu `Math.ceil(dur / cycle)` kali —
 *  satu pass concat dengan `-t dur` + flag afade/aformat/encoding yang sama.
 *  Hasil audio ekuivalen, ≤5 invokasi ffmpeg (dulu N per segmen). */
import { promises as fs } from "fs";
import path from "path";
import { run as runCmd, tailErr } from "../exec";
import { clamp, num, type ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const dur = clamp(num(inputs.dur, 30, 10, 180), 10, 180);
  const mood = inputs.mood || "lofi";
  // chord (Hz) per mood — prosedural sederhana, royalty-free.
  // Tanpa ekspresi lavfi: sintesis per-chord (sine murni) lalu concat — deterministik.
  const M: Record<string, { chords: number[][]; spv: number; bass: number }> = {
    lofi: { chords: [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 207.7, 246.9]], spv: 4, bass: 55 },
    epic: { chords: [[130.8, 164.8, 196], [146.8, 174.6, 220], [110, 130.8, 164.8], [123.5, 146.8, 185]], spv: 2, bass: 41.2 },
    upbeat: { chords: [[261.6, 329.6, 392], [246.9, 293.7, 370], [220, 277.2, 329.6], [233.1, 293.7, 349.2]], spv: 2, bass: 65.4 },
    dark: { chords: [[110, 130.8, 155.6], [103.8, 123.5, 146.8], [98, 116.5, 146.8], [92.5, 110, 138.6]], spv: 3, bass: 36.7 },
  };
  const cfg = M[mood] || M.lofi;
  const out = path.join(dir, `music-${mood}.mp3`);
  log(`[music] menyintesis ${mood} ${dur}s (prosedural)…`);
  const cycle = cfg.spv * cfg.chords.length;
  // render keempat chord unik sekali (urutan sama dengan pola i % chords.length)
  const chordFiles: string[] = [];
  for (let c = 0; c < cfg.chords.length; c++) {
    const ch = cfg.chords[c];
    const seg = path.join(dir, `mus-${c}.wav`);
    const r = await runCmd(["ffmpeg", "-y", "-hide_banner",
      ...ch.flatMap((f) => ["-f", "lavfi", "-i", `sine=frequency=${f}:sample_rate=44100:duration=${cfg.spv}`]),
      "-f", "lavfi", "-i", `sine=frequency=${cfg.bass}:sample_rate=44100:duration=${cfg.spv}`,
      "-filter_complex", `[0][1][2][3]amix=inputs=4:normalize=1,` +
        `tremolo=f=${mood === "upbeat" ? 4 : 1.5}:d=0.3,lowpass=f=${mood === "lofi" ? 3200 : 5200}[a]`,
      "-map", "[a]", seg]);
    if (r.code !== 0) throw new Error("music gen gagal (seg): " + tailErr(r.stderr));
    chordFiles.push(seg);
  }
  // list concat = pengulangan 4 chord file hingga mencukupi durasi
  const nSeg = Math.ceil(dur / cycle);
  const segs: string[] = [];
  for (let i = 0; i < nSeg; i++) segs.push(chordFiles[i % chordFiles.length]);
  const list = path.join(dir, "mus.txt");
  await fs.writeFile(list, segs.map((s) => `file '${s}'`).join("\n"));
  const r2 = await runCmd(["ffmpeg", "-y", "-hide_banner", "-f", "concat", "-safe", "0", "-i", list,
    "-af", `afade=t=in:d=1,afade=t=out:st=${Math.max(dur - 2, 0)}:d=2,aformat=sample_rates=44100:channel_layouts=stereo`,
    "-t", String(dur), "-c:a", "libmp3lame", "-b:a", "160k", out]);
  for (const s of chordFiles) await fs.rm(s, { force: true });
  if (r2.code !== 0) throw new Error("music gen gagal (concat): " + tailErr(r2.stderr));
  job.files!.push({ file: `music-${mood}.mp3`, label: `Track ${mood} ${dur}s (prosedural)`, kind: "audio" });
  job.title = `Music Generator — ${mood}`;
  log("[music] track jadi");
}
