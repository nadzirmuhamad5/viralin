/** Tool "motion-graphic" — kartu intro 5s: judul animasi slide-up di gradient. */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "../mediakit";
import { run as runCmd, tailErr } from "../exec";
import type { ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const palet: Record<string, [string, string]> = {
    green: ["0x052e16", "0x22c55e"], blue: ["0x0c192e", "0x3b82f6"],
    orange: ["0x431407", "0xf97316"], pink: ["0x500724", "0xec4899"],
  };
  const [c0, c1] = palet[inputs.warna || "green"] || palet.green;
  const judul = (inputs.judul || "VIRALIN").toUpperCase().slice(0, 30);
  const sub = (inputs.subjudul || "").slice(0, 60);
  const ass = [
    "[Script Info]", "ScriptType: v4.00+", "PlayResX: 540", "PlayResY: 960",
    "WrapStyle: 2", "ScaledBorderAndShadow: yes", "", "[V4+ Styles]",
    "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
    "Style: MG,Montserrat ExtraBold,54,&H00FFFFFF&,&H00FFFFFF&,&H00111111&,&H00000000,0,0,0,0,100,100,0,0,1,4,0,5,40,40,0,1",
    "", "[Events]", "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
    `Dialogue: 0,0:00:00.20,0:00:04.80,MG,,0,0,0,,{\\move(270,560,270,470,0,700)\\fscx60\\fscy60\\t(0,700,\\fscx100\\fscy100)}${judul.replace(/[{}]/g, "")}`,
    ...(sub ? [`Dialogue: 0,0:00:00.70,0:00:04.80,MG,,0,0,0,,{\\move(270,660,270,560,0,700)\\alpha&HFF&\\t(500,900,\\alpha&H00&)\\fs30\\bord2}${sub.replace(/[{}]/g, "")}`] : []),
  ].join("\n");
  const assPath = path.join(dir, "motion.ass");
  await fs.writeFile(assPath, ass);
  const out = path.join(dir, "motion-intro.mp4");
  const r = await runCmd(["ffmpeg", "-y", "-hide_banner",
    "-f", "lavfi", "-i", `gradients=s=540x960:c0=${c0}:c1=${c1}:duration=5:speed=0.03`,
    "-vf", `subtitles=filename='${assPath}':fontsdir='${mk.FONTS_DIR}'`,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", out]);
  if (r.code !== 0) throw new Error("motion graphic gagal: " + tailErr(r.stderr));
  job.files!.push({ file: "motion-intro.mp4", label: "Intro 5s — kartu judul animasi", kind: "video" });
  job.title = `Motion Graphic — ${judul}`;
  log("[motion] intro jadi");
}
