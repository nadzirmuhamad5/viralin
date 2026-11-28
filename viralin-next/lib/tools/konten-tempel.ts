/** Tool "konten-tempel" (VIRAL Content Creator) — naskah/TTS/background AI
 *  → video vertikal ber-caption karaoke. */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "../mediakit";
import { fetchBroll, extractBrollKeyword } from "../broll";
import { run as runCmd, tailErr } from "../exec";
import { buildAss, type Word } from "../captions";
import { thumb, type ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const presetId = inputs.preset || job.captionPreset || "bold-impact";
  let naskah = (inputs.naskah || "").trim();
  if (!naskah) {
    const topik = (inputs.topik || "").trim();
    if (!topik) throw new Error("isi topik ATAU naskah");
    naskah = await mk.zaiChat(
      "Kamu penulis naskah video viral Indonesia (TikTok/Reels). Gaya: hook 3 detik pertama, 3 poin padat, CTA di akhir. Maks 130 kata. Keluarkan HANYA teks naskah tanpa label.",
      `Topik: ${topik}`, log);
    log(`[naskah] LLM menulis ${naskah.length} karakter`);
  }
  job.texts!.push({ label: "Naskah voiceover", body: naskah });
  const speech = path.join(dir, "speech.mp3");
  await mk.ttsSynth(naskah, inputs.voice || "id-ID-ArdiNeural", speech, "+0%", log);
  const wav = await mk.extractAudio(speech, dir);
  const info = await mk.transcribe(wav, dir, log);
  const words: Word[] = info.segments.flatMap((s) => s.words || []);
  const dur = info.duration + 0.8;
  // background: gambar AI, gradient, atau video B-Roll (YouTube/Pexels)
  const bgPrompt = `Background sinematik vertikal 9:16 untuk video narasi ber-captions besar di tengah-bawah: ${(inputs.topik || naskah.slice(0, 80))}. Tanpa teks, tanpa wajah closeup, gelap di area bawah tengah agar caption terbaca.`;
  let bgFile: string;
  let bgIsVideo = false;
  const bgMode = inputs.bg || "ai";
  if (bgMode === "ai") {
    bgFile = path.join(dir, "bg.png");
    await mk.zaiImage(bgPrompt, bgFile, log);
  } else if (bgMode.startsWith("broll")) {
    const keyword = await extractBrollKeyword(naskah, inputs.topik || "", log);
    log(`[broll] keyword: ${keyword}`);
    const source = bgMode === "broll-yt" ? "yt" : bgMode === "broll-pexels" ? "pexels" : "auto";
    const broll = await fetchBroll(keyword, dir, log, source);
    if (broll) {
      bgFile = broll;
      bgIsVideo = true;
    } else {
      // B-Roll gagal → jangan gagalkan job, fallback ke gambar AI
      log("[broll] gagal, fallback ke gambar AI");
      bgFile = path.join(dir, "bg.png");
      await mk.zaiImage(bgPrompt, bgFile, log);
    }
  } else {
    bgFile = path.join(dir, "bg.png");
    const g = await runCmd(["ffmpeg", "-y", "-hide_banner", "-f", "lavfi",
      "-i", `gradients=s=720x1440:c0=0x050505:c1=0x123524:duration=1`, "-frames:v", "1", bgFile]);
    if (g.code !== 0) throw new Error("gradient gagal: " + tailErr(g.stderr));
  }
  // ass pakai whisper word times relatif audio → langsung
  const ass = buildAss(words, { presetId, clipStart: 0, clipEnd: dur });
  const assPath = path.join(dir, "content.ass");
  await fs.writeFile(assPath, ass);
  const out = path.join(dir, "konten-viral.mp4");
  log("[render] menggabungkan background + suara + caption…");
  // video B-Roll di-loop sampai durasi narasi + crop 9:16; gambar cukup -loop 1.
  // -map eksplisit: video dari background, audio dari narasi (bukan audio bawaan B-Roll).
  const bgArgs = bgIsVideo ? ["-stream_loop", "-1", "-i", bgFile] : ["-loop", "1", "-i", bgFile];
  const vf = bgIsVideo
    ? `crop=w='trunc(min(iw,ih*9/16)/2)*2':h=ih,scale=540:960,subtitles=filename='${assPath}':fontsdir='${mk.FONTS_DIR}'`
    : `scale=540:960,subtitles=filename='${assPath}':fontsdir='${mk.FONTS_DIR}'`;
  const r = await runCmd(["ffmpeg", "-y", "-hide_banner", ...bgArgs, "-i", speech,
    "-t", String(dur),
    "-vf", vf, "-map", "0:v", "-map", "1:a",
    "-af", "afade=t=out:st=" + Math.max(dur - 0.8, 0) + ":d=0.8",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-c:a", "aac", "-b:a", "160k",
    "-pix_fmt", "yuv420p", "-shortest", "-movflags", "+faststart", out]);
  if (r.code !== 0) throw new Error("render konten gagal: " + tailErr(r.stderr));
  const st = await fs.stat(out);
  await thumb(dir, out, "th-konten.jpg");
  job.clips.push({ file: "konten-viral.mp4", thumb: "th-konten.jpg", start: 0,
    end: Math.round(dur * 10) / 10, seconds: Math.round(dur * 10) / 10, bytes: st.size,
    title: (naskah.slice(0, 50) || "Konten Viral"), lines: words.length, preset: presetId });
  job.title = "VIRAL Content Creator";
  log(`[konten] jadi ${Math.round(dur)}s (${(st.size / 1e6).toFixed(2)} MB)`);
}
