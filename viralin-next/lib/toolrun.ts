/** Runner semua tool — dipanggil pipeline berdasarkan job.tool.
 *  Stack gratis: ffmpeg · faster-whisper · edge-tts · z-ai (GLM chat + image). */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "./mediakit";
import { run, tailErr } from "./exec";
import { PRESETS, type Word } from "./captions";
import type { Job } from "./store";

type Input = Record<string, string>;
type Log = (l: string) => void;
const num = (v: string | undefined, d: number, min = 0, max = 3600) => {
  const n = parseFloat(v || "");
  return isNaN(n) ? d : Math.min(max, Math.max(min, n));
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export async function runTool(job: Job, dir: string, log: Log): Promise<void> {
  const inputs = job.inputs || {};
  const R: Record<string, (dir: string, log: Log) => Promise<void>> = {
    "atur-manual": aturManual,
    "merge-video": mergeVideo,
    "seamless-loop": seamlessLoop,
    "wa-story-hd": waStoryHd,
    "brand-kit": brandKit,
    thumbnail: thumbnail,
    "highlight-bola": highlightBola,
    "motion-graphic": motionGraphic,
    "konten-tempel": kontenTempel,
    transcript: transcript,
    "title-optimizer": titleOptimizer,
    "viral-tips": viralTips,
    "prompt-gen": promptGen,
    "ai-image": aiImage,
    dubbing: dubbing,
    "music-gen": musicGen,
  };
  const fn = R[job.tool || ""];
  if (!fn) throw new Error(`tool "${job.tool}" tidak dikenal`);
  await fn(dir, log);

  async function aturManual(_d: string, log: Log): Promise<void> {
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

  async function mergeVideo(_d: string, log: Log): Promise<void> {
    const urls = (inputs.sources || "").split(/\n+/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s)).slice(0, 4);
    if (urls.length < 2) throw new Error("butuh minimal 2 URL video (satu per baris)");
    const perdur = num(inputs.perdur, 15, 5, 60);
    const segs: string[] = [];
    for (let i = 0; i < urls.length; i++) {
      log(`[merge] sumber ${i + 1}/${urls.length}…`);
      const sub = path.join(dir, `in-${i}`);
      const { src } = await mk.getSource(urls[i], sub, log, inputs.cookies);
      const seg = path.join(dir, `seg-${i}.mp4`);
      const r = await run(["ffmpeg", "-y", "-hide_banner", "-i", src, "-t", String(perdur),
        "-vf", "crop=w='trunc(min(iw,ih*9/16)/2)*2':h=ih,scale=540:960,fps=30",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", seg]);
      if (r.code !== 0) throw new Error(`segmen ${i + 1} gagal: ${tailErr(r.stderr)}`);
      segs.push(seg);
    }
    const list = path.join(dir, "list.txt");
    await fs.writeFile(list, segs.map((s) => `file '${s}'`).join("\n"));
    const out = path.join(dir, "merge.mp4");
    const r2 = await run(["ffmpeg", "-y", "-hide_banner", "-f", "concat", "-safe", "0", "-i", list,
      "-c", "copy", "-movflags", "+faststart", out]);
    if (r2.code !== 0) throw new Error("concat gagal: " + tailErr(r2.stderr));
    for (const s of segs) await fs.rm(s, { force: true });
    const st = await fs.stat(out);
    job.files.push({ file: "merge.mp4", label: `Hasil merge ${urls.length} video`, kind: "video" });
    job.title = `Merge ${urls.length} video`;
    log(`[merge] jadi (${(st.size / 1e6).toFixed(2)} MB)`);
  }

  async function seamlessLoop(_d: string, log: Log): Promise<void> {
    const { src, dur } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
    const start = clamp(num(inputs.start, 0), 0, Math.max(dur - 3, 0));
    const dl = clamp(num(inputs.dur, 6, 3, 15), 3, Math.max(dur - start, 3));
    const fwd = path.join(dir, "fwd.mp4");
    await run(["ffmpeg", "-y", "-hide_banner", "-ss", String(start), "-i", src, "-t", String(dl),
      "-vf", "crop=w='trunc(min(iw,ih*9/16)/2)*2':h=ih,scale=540:960,fps=30", "-an",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", fwd]);
    const out = path.join(dir, "loop.mp4");
    const r = await run(["ffmpeg", "-y", "-hide_banner", "-i", fwd,
      "-filter_complex", "[0:v]split[a][b];[b]reverse[rev];[a][rev]concat=n=2:v=1,fade=t=in:d=0.25,fade=t=out:st=" +
        (dl * 2 - 0.25).toFixed(2) + ":d=0.25[v]",
      "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-movflags", "+faststart", out]);
    if (r.code !== 0) throw new Error("loop gagal: " + tailErr(r.stderr));
    await fs.rm(fwd, { force: true });
    await thumb(dir, out, "th-loop.jpg");
    job.files.push({ file: "loop.mp4", label: `Loop boomerang ${Math.round(dl * 2)}s`, kind: "video" });
    job.title = "Seamless Loop";
    log("[loop] boomerang jadi");
  }

  async function waStoryHd(_d: string, log: Log): Promise<void> {
    const { src, dur } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
    const start = clamp(num(inputs.start, 0), 0, Math.max(dur - 3, 0));
    const dl = inputs.dur ? clamp(num(inputs.dur, dur, 3, 300), 3, dur - start) : undefined;
    const out = path.join(dir, "wa-story-hd.mp4");
    const r = await run(["ffmpeg", "-y", "-hide_banner", "-ss", String(start), "-i", src,
      ...(dl ? ["-t", String(dl)] : []),
      "-vf", "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280",
      "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
      "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-c:a", "aac", "-b:a", "160k",
      "-movflags", "+faststart", out]);
    if (r.code !== 0) throw new Error("WA Story gagal: " + tailErr(r.stderr));
    const st = await fs.stat(out);
    job.files.push({ file: "wa-story-hd.mp4", label: "Story 720×1280 HD + loudnorm", kind: "video" });
    job.title = "WA Story HD";
    log(`[wa] jadi (${(st.size / 1e6).toFixed(2)} MB)`);
  }

  async function brandKit(_d: string, log: Log): Promise<void> {
    const { src } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
    const logoPath = path.join(dir, "logo.png");
    const lr = await run(["curl", "-sL", "--max-time", "30", "-o", logoPath, inputs.logo]);
    if (lr.code !== 0 || !(await fs.stat(logoPath).then(() => true).catch(() => false))) {
      throw new Error("logo gagal diunduh");
    }
    const op = clamp(num(inputs.opacity, 80, 10, 100), 10, 100) / 100;
    const sc = clamp(num(inputs.scale, 18, 5, 50), 5, 50) / 100;
    const logoW = Math.max(40, Math.round(540 * sc)); // % dari lebar output 540
    const pos: Record<string, string> = {
      tl: "30:30", tr: `main_w-overlay_w-30:30`,
      bl: "30:main_h-overlay_h-30", br: `main_w-overlay_w-30:main_h-overlay_h-30`,
    };
    const [px, py] = (pos[inputs.position || "tr"] || pos.tr).split(":");
    const out = path.join(dir, "branded.mp4");
    const r = await run(["ffmpeg", "-y", "-hide_banner", "-i", src, "-i", logoPath, "-t", "120",
      "-filter_complex",
      `[1]scale=${logoW}:-1,format=rgba,colorchannelmixer=aa=${op}[lg];` +
      `[0][lg]overlay=x=${px}:y=${py}[v]`,
      "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
      "-c:a", "copy", "-t", "120", out]);
    if (r.code !== 0) throw new Error("watermark gagal: " + tailErr(r.stderr));
    job.files.push({ file: "branded.mp4", label: "Video + watermark logo", kind: "video" });
    job.title = "Brand Kit — Watermark";
    log("[brand] watermark terpasang");
  }

  async function thumbnail(_d: string, log: Log): Promise<void> {
    const base = path.join(dir, "thumb");
    // 1. coba yt-dlp (thumbnail resmi YouTube/TikTok, semua resolusi)
    try {
      await mk.ytdlpFetch(["-q", "--skip-download", "--write-thumbnail", "-o", base],
        inputs.source, inputs.cookies, log);
    } catch (e) {
      // cookies invalid → error jelas; selain itu lanjut fallback frame ffmpeg
      if (String((e as Error).message).includes("cookies tidak ditemukan")) throw e;
    }
    let found = (await fs.readdir(dir)).filter(
      (f) => f.startsWith("thumb") && /\.(jpg|jpeg|png|webp)$/i.test(f)
    );
    // 2. URL file langsung / tanpa metadata thumbnail → fallback: ambil frame video
    if (!found.length) {
      const { src, dur } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
      log("[thumb] URL tanpa thumbnail resmi → ambil frame video via ffmpeg…");
      const stamps = dur > 3 ? [dur * 0.1, dur * 0.5, dur * 0.9] : [0];
      for (let i = 0; i < stamps.length; i++) {
        const out = `thumb-frame-${i + 1}.jpg`;
        const fr = await run(["ffmpeg", "-y", "-hide_banner", "-ss", String(stamps[i]),
          "-i", src, "-frames:v", "1", "-q:v", "3", path.join(dir, out)]);
        if (fr.code !== 0) continue;
        found.push(out);
      }
    }
    if (!found.length) throw new Error("tidak ada thumbnail tersimpan");
    for (const f of found) {
      job.files.push({
        file: f,
        label: f.startsWith("thumb-frame") ? "Frame video (fallback)" : "Thumbnail",
        kind: "image",
      });
    }
    job.title = "Thumbnail Video";
    log(`[thumb] ${found.length} thumbnail diambil`);
  }

  async function highlightBola(_d: string, log: Log): Promise<void> {
    const { src, dur } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
    const capDur = Math.min(dur, 600);
    const wav = await mk.extractAudio(src, dir, capDur);
    const count = clamp(num(inputs.count, 3, 1, 6), 1, 6);
    const seglen = clamp(num(inputs.seglen, 12, 6, 30), 6, 30);
    log("[bola] mencari ledakan energi audio…");
    const sp = path.join(process.cwd(), "worker", "sports.py");
    const r = await run([mk.PY, sp, wav, "--count", String(count), "--seglen", String(seglen)],
      { env: mk.ENV });
    if (r.code !== 0) throw new Error("analisis energi gagal: " + tailErr(r.stderr));
    const peaks = JSON.parse(r.stdout) as Array<{ start: number; end: number; score: number }>;
    if (!peaks.length) throw new Error("tidak ada puncak audio terdeteksi");
    log(`[bola] ${peaks.length} momen: ` + peaks.map((p) => `${p.start}s(x${p.score})`).join(", "));
    const sb = (inputs.scoreboard || "").trim();
    for (let i = 0; i < peaks.length; i++) {
      const p = peaks[i];
      const out = path.join(dir, `highlight-${i + 1}.mp4`);
      const vf = "scale=960:540:force_original_aspect_ratio=increase,crop=960:540,fps=30" +
        (sb ? `,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${sb.replace(/[':\\]/g, "")}':fontsize=40:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=12:x=(w-text_w)/2:y=28` : "");
      const rr = await run(["ffmpeg", "-y", "-hide_banner", "-ss", String(p.start), "-i", src,
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

  async function motionGraphic(_d: string, log: Log): Promise<void> {
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
    const r = await run(["ffmpeg", "-y", "-hide_banner",
      "-f", "lavfi", "-i", `gradients=s=540x960:c0=${c0}:c1=${c1}:duration=5:speed=0.03`,
      "-vf", `subtitles=filename='${assPath}':fontsdir='${mk.FONTS_DIR}'`,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart", out]);
    if (r.code !== 0) throw new Error("motion graphic gagal: " + tailErr(r.stderr));
    job.files.push({ file: "motion-intro.mp4", label: "Intro 5s — kartu judul animasi", kind: "video" });
    job.title = `Motion Graphic — ${judul}`;
    log("[motion] intro jadi");
  }

  async function kontenTempel(_d: string, log: Log): Promise<void> {
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
    job.texts.push({ label: "Naskah voiceover", body: naskah });
    const speech = path.join(dir, "speech.mp3");
    await mk.ttsSynth(naskah, inputs.voice || "id-ID-ArdiNeural", speech, "+0%", log);
    const wav = await mk.extractAudio(speech, dir);
    const info = await mk.transcribe(wav, dir, log);
    const words: Word[] = info.segments.flatMap((s) => s.words || []);
    const dur = info.duration + 0.8;
    // background
    let bgFile: string;
    if ((inputs.bg || "ai") === "ai") {
      bgFile = path.join(dir, "bg.png");
      await mk.zaiImage(
        `Background sinematik vertikal 9:16 untuk video narasi ber-captions besar di tengah-bawah: ${(inputs.topik || naskah.slice(0, 80))}. Tanpa teks, tanpa wajah closeup, gelap di area bawah tengah agar caption terbaca.`,
        bgFile, log);
    } else {
      bgFile = path.join(dir, "bg.png");
      const g = await run(["ffmpeg", "-y", "-hide_banner", "-f", "lavfi",
        "-i", `gradients=s=720x1440:c0=0x050505:c1=0x123524:duration=1`, "-frames:v", "1", bgFile]);
      if (g.code !== 0) throw new Error("gradient gagal: " + tailErr(g.stderr));
    }
    // ass pakai whisper word times relatif audio → langsung
    const ass = (await import("./captions")).buildAss(words, { presetId, clipStart: 0, clipEnd: dur });
    const assPath = path.join(dir, "content.ass");
    await fs.writeFile(assPath, ass);
    const out = path.join(dir, "konten-viral.mp4");
    log("[render] menggabungkan background + suara + caption…");
    const r = await run(["ffmpeg", "-y", "-hide_banner", "-loop", "1", "-i", bgFile, "-i", speech,
      "-t", String(dur),
      "-vf", `scale=540:960,subtitles=filename='${assPath}':fontsdir='${mk.FONTS_DIR}'`,
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

  async function transcript(_d: string, log: Log): Promise<void> {
    const { src, dur } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
    const wav = await mk.extractAudio(src, dir, Math.min(dur, 900));
    const info = await mk.transcribe(wav, dir, log);
    const srt = toSrt(info.segments);
    const vtt = toVtt(info.segments);
    const txt = info.segments.map((s) => s.text).join(" ");
    await fs.writeFile(path.join(dir, "transkrip.srt"), srt);
    await fs.writeFile(path.join(dir, "transkrip.vtt"), vtt);
    await fs.writeFile(path.join(dir, "transkrip.txt"), txt);
    job.files.push({ file: "transkrip.srt", label: "Subtitle SRT", kind: "subtitle" });
    job.files.push({ file: "transkrip.vtt", label: "Subtitle VTT", kind: "subtitle" });
    job.files.push({ file: "transkrip.txt", label: "Teks polos", kind: "subtitle" });
    job.texts.push({ label: "Pratinjau transkrip", body: txt.slice(0, 600) + (txt.length > 600 ? "…" : "") });
    job.title = "Transcript AI";
    log(`[transkrip] ${info.segments.length} segmen tersimpan`);
  }

  async function titleOptimizer(_d: string, log: Log): Promise<void> {
    const platform = inputs.platform || "youtube";
    const raw = await mk.zaiChat(
      "Kamu ahli judul viral pasar Indonesia. Balas HANYA JSON: {\"judul\":[{\"t\":\"...\",\"skor\":0-100,\"alasan\":\"...\"}]} — 8 judul terbaik, terurut skor tertinggi. Judul maks 70 karakter.",
      `Judul sekarang: "${inputs.judul}". Platform: ${platform}. Berikan 8 alternatif judul dengan skor potensi klik.`, log);
    const j = mk.extractJson<{ judul: Array<{ t: string; skor: number; alasan: string }> }>(raw);
    const lines = j.judul.map((x, i) => `${i + 1}. [skor ${x.skor}] ${x.t}\n   ↳ ${x.alasan}`).join("\n");
    job.texts.push({ label: "8 Judul Optimal (LLM gratis GLM)", body: lines });
    job.title = "Optimasi Judul";
    log("[judul] 8 alternatif siap");
  }

  async function viralTips(_d: string, log: Log): Promise<void> {
    const raw = await mk.zaiChat(
      "Kamu strategist konten viral Indonesia. Balas HANYA JSON: {\"ide\":[{\"judul\":\"...\",\"hook\":\"...\",\"cta\":\"...\"}]} — 5 ide, hook maks 12 kata, CTA praktis.",
      `Niche akun: "${inputs.niche}". Konteks: pasar TikTok/Reels Indonesia 2026.`, log);
    const j = mk.extractJson<{ ide: Array<{ judul: string; hook: string; cta: string }> }>(raw);
    const lines = j.ide.map((x, i) =>
      `${i + 1}. ${x.judul}\n   Hook: "${x.hook}"\n   CTA: ${x.cta}`).join("\n");
    job.texts.push({ label: "5 Ide Konten Viral", body: lines });
    job.title = "Saran Viral AI";
    log("[tips] 5 ide siap");
  }

  async function promptGen(_d: string, log: Log): Promise<void> {
    const target = inputs.target === "image" ? "AI image generator" : "AI video generator";
    const out = await mk.zaiChat(
      `Kamu prompt engineer. Ubah ide mentah menjadi 1 prompt ${target} tinggal pakai: subjek detail, komposisi, lighting, gaya kamera, mood, dan negative prompt. Bahasa Indonesia, format rapi.`,
      `Ide: ${inputs.ide}`, log);
    job.texts.push({ label: "Prompt siap pakai", body: out });
    job.title = "Generate Prompt";
    log("[prompt] jadi");
  }

  async function aiImage(_d: string, log: Log): Promise<void> {
    const size = /^(\d+x\d+)$/.test(inputs.size || "") ? inputs.size : "1024x1024";
    const out = path.join(dir, "gambar.png");
    await mk.zaiImage(inputs.prompt, out, log);
    job.files.push({ file: "gambar.png", label: `Gambar AI ${size}`, kind: "image" });
    job.title = "Klipers AI — Gambar";
    log("[image] gambar jadi");
  }

  async function dubbing(_d: string, log: Log): Promise<void> {
    const { src, dur } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
    const cap = clamp(num(inputs.dur, 45, 10, 120), 10, Math.min(dur, 120));
    const wav = await mk.extractAudio(src, dir, cap);
    const info = await mk.transcribe(wav, dir, log);
    const segs = info.segments.slice(0, 60);
    log(`[dubbing] ${segs.length} segmen → disuarakan ulang ${inputs.voice}…`);
    const args: string[] = ["-y", "-hide_banner"];
    let drift = 0;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const mp3 = path.join(dir, `dub-${i}.mp3`);
      await mk.ttsSynth(s.text, inputs.voice || "id-ID-GadisNeural", mp3, "+10%", log);
      const sd = await mk.probeDur(mp3);
      drift += Math.max(0, sd - (s.end - s.start));
      args.push("-itsoffset", String(Math.max(s.start, 0)), "-i", mp3);
    }
    if (!segs.length) throw new Error("tidak ada ucapan untuk di-dubbing");
    const dub = path.join(dir, "dub-audio.m4a");
    args.push("-filter_complex", `amix=inputs=${segs.length}:normalize=0:duration=longest[a]`,
      "-map", "[a]", "-c:a", "aac", "-b:a", "160k", dub);
    const rm = await run(["ffmpeg", ...args]);
    for (let i = 0; i < segs.length; i++) await fs.rm(path.join(dir, `dub-${i}.mp3`), { force: true });
    if (rm.code !== 0) throw new Error("mix audio gagal: " + tailErr(rm.stderr));
    const out = path.join(dir, "dubbed.mp4");
    const r2 = await run(["ffmpeg", "-y", "-hide_banner", "-t", String(cap), "-i", src, "-i", dub,
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
    job.texts.push({ label: "Drift timing", body: `total drift suara baru vs asli: ±${drift.toFixed(1)}s (edge-tts tanpa alignment kata)` });
    job.title = "Voice Dubbing";
    log(`[dubbing] jadi (drift ±${drift.toFixed(1)}s)`);
  }

  async function musicGen(_d: string, log: Log): Promise<void> {
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
    const nSeg = Math.ceil(dur / cycle);
    const segs: string[] = [];
    for (let i = 0; i < nSeg; i++) {
      const ch = cfg.chords[i % cfg.chords.length];
      const seg = path.join(dir, `mus-${i}.wav`);
      const r = await run(["ffmpeg", "-y", "-hide_banner",
        ...ch.flatMap((f) => ["-f", "lavfi", "-i", `sine=frequency=${f}:sample_rate=44100:duration=${cfg.spv}`]),
        "-f", "lavfi", "-i", `sine=frequency=${cfg.bass}:sample_rate=44100:duration=${cfg.spv}`,
        "-filter_complex", `[0][1][2][3]amix=inputs=4:normalize=1,` +
          `tremolo=f=${mood === "upbeat" ? 4 : 1.5}:d=0.3,lowpass=f=${mood === "lofi" ? 3200 : 5200}[a]`,
        "-map", "[a]", seg]);
      if (r.code !== 0) throw new Error("music gen gagal (seg): " + tailErr(r.stderr));
      segs.push(seg);
    }
    const list = path.join(dir, "mus.txt");
    await fs.writeFile(list, segs.map((s) => `file '${s}'`).join("\n"));
    const r2 = await run(["ffmpeg", "-y", "-hide_banner", "-f", "concat", "-safe", "0", "-i", list,
      "-af", `afade=t=in:d=1,afade=t=out:st=${Math.max(dur - 2, 0)}:d=2,aformat=sample_rates=44100:channel_layouts=stereo`,
      "-t", String(dur), "-c:a", "libmp3lame", "-b:a", "160k", out]);
    for (const s of segs) await fs.rm(s, { force: true });
    if (r2.code !== 0) throw new Error("music gen gagal (concat): " + tailErr(r2.stderr));
    job.files.push({ file: `music-${mood}.mp3`, label: `Track ${mood} ${dur}s (prosedural)`, kind: "audio" });
    job.title = `Music Generator — ${mood}`;
    log("[music] track jadi");
  }

  async function thumb(dir: string, video: string, name: string): Promise<void> {
    await run(["ffmpeg", "-y", "-hide_banner", "-ss", "1", "-i", video,
      "-frames:v", "1", "-vf", "scale=180:320", path.join(dir, name)]);
  }
}

function pad(n: number, w = 2): string {
  return String(Math.floor(n)).padStart(w, "0");
}
function tsSrt(t: number): string {
  const ms = Math.round((t % 1) * 1000);
  return `${pad(t / 3600)}:${pad((t / 60) % 60)}:${pad(t % 60)},${pad(ms, 3)}`;
}
function tsVtt(t: number): string {
  const ms = Math.round((t % 1) * 1000);
  return `${pad(t / 3600)}:${pad((t / 60) % 60)}:${pad(t % 60)}.${pad(ms, 3)}`;
}
function toSrt(segs: Array<{ start: number; end: number; text: string }>): string {
  return segs.map((s, i) => `${i + 1}\n${tsSrt(s.start)} --> ${tsSrt(s.end)}\n${s.text}`).join("\n\n");
}
function toVtt(segs: Array<{ start: number; end: number; text: string }>): string {
  return "WEBVTT\n\n" + segs.map((s) => `${tsVtt(s.start)} --> ${tsVtt(s.end)}\n${s.text}`).join("\n\n");
}
