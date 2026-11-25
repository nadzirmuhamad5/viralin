/** Runner semua tool — dipanggil pipeline berdasarkan job.tool.
 *  Stack gratis: ffmpeg · faster-whisper · edge-tts · z-ai (GLM chat + image). */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "./mediakit";
import { run, tailErr } from "./exec";
import { PRESETS, type Word } from "./captions";
import type { Job } from "./store";
import { motionSectionDurs, type MotionStudioProps, type WarnaId } from "./motion";
import type { ViralKontenProps } from "./viral";

/** Cache bundle Remotion (webpack) — sekali bundle, dipakai semua job berikutnya. */
let bundleCache: string | null = null;

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
    "motion-studio": motionStudio,
    "konten-tempel": kontenTempel,
    ragebait: kontenTempel,
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

  async function motionStudio(_d: string, log: Log): Promise<void> {
    let judul: string; let items: string[]; let cta: string; let anims: string[] = []; let imgsP: string[] = [];
    let hookNar = ""; let ctaNar = ""; let bulletNars: string[] = []; // narasi per bagian dari LLM
    if ((inputs.mode || "manual") === "ai" || (inputs.mode || "manual") === "berita") {
      const isBerita = (inputs.mode || "manual") === "berita";
      let material: string;
      if (isBerita) {
        // headline dari scheduler (inputs.headline) atau ambil RSS langsung (jalankan dari form)
        let headline = (inputs.headline || "").trim();
        const sumber = (inputs.sumber || "").trim();
        if (!headline) {
          const { newsHeadlines } = await import("./berita");
          const picks = await newsHeadlines(inputs.topik || "", log, 8);
          if (!picks.length) throw new Error("mode Berita: RSS tidak punya item — coba rubrik lain");
          headline = picks[0].title;
        }
        log(`[berita] headline: "${headline.slice(0, 72)}"${sumber ? ` — ${sumber}` : ""}`);
        material = `Headline berita hari ini: "${headline}"${sumber ? ` — sumber: ${sumber}` : ""}${inputs.topik ? ` — rubrik: ${inputs.topik}` : ""}`;
        log("[ai] mode berita — LLM menyusun hook/bullet/CTA dari headline…");
      } else {
        // mode otomatis: LLM (Coarena/z-ai) menyusun hook/bullet/CTA + memilih anim per poin
        const topik = (inputs.topik || "").trim();
        if (!topik) throw new Error("Mode AI: isi Topik dulu (mis. \"tips hemat belanja mahasiswa\")");
        log("[ai] mode otomatis — LLM menyusun hook/bullet/CTA…");
        material = `Topik/niche: ${topik}`;
      }
      const raw = await mk.llmChat(
        "Kamu penulis konten short-video viral Indonesia. Susun struktur Motion Studio dari bahan yang diberikan. " +
        (isBerita
          ? "Bahan di bawah adalah headline berita NYATA — buat versi viralnya TANPA mengarang fakta tambahan; sudut pandang/opini boleh. "
          : "") +
        "Balas HANYA JSON valid tanpa penjelasan: {\"judul\":\"HOOK KAPITAL maks 40 karakter\", " +
        "\"n\":\"1 kalimat narasi pembuka yg menjelaskan hook (yg dibaca voice-over)\", " +
        "\"bullets\":[{\"t\":\"poin pendek maks 60 karakter\",\"anim\":\"money\",\"img\":\"deskripsi visual 2-5 kata\"," +
        "\"n\":\"1-2 kalimat narasi detail poin ini (yg dibaca voice-over)\"}], \"cta\":\"CTA maks 30 karakter\", " +
        "\"cn\":\"1 kalimat ajakan penutup yg enak dibaca voice-over\"}. " +
        "Buat 4-8 poin. Untuk TIAP poin pilih anim yang paling cocok dengan isinya, salah satu dari: " +
        "money (uang/hemat/belanja), phone (HP/aplikasi/sosmed), check (langkah/cara/tips), heart (cinta/suka), " +
        "fire (viral/trending), alert (larangan/awas), clock (waktu/cepat), chat (obrolan/pendapat), " +
        "rocket (naik/sukses), counter (angka/statistik), kuliner (makanan/minuman/kopi), bola (olahraga), " +
        "belajar (sekolah/buku), medis (kesehatan/sakit), musik (lagu/konser), travel (liburan/wisata), " +
        "cuaca (hujan/musim), game (game/esports), mega (berita/pengumuman), target (tujuan/mimpi), slide (lainnya). " +
        "img = deskripsi VISUAL untuk ilustrasi latar poin itu (objek/pemandangan khas topiknya, tanpa teks).",
        material, log);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("mode AI: LLM tidak membalas JSON — coba topik berbeda");
      let j: { judul?: string; bullets?: unknown; cta?: string; n?: unknown; cn?: unknown };
      try { j = JSON.parse(m[0]); } catch { throw new Error("mode AI: JSON dari LLM rusak — jalankan ulang"); }
      judul = String(j.judul || "VIRALIN").toUpperCase().slice(0, 40);
      hookNar = String(j.n || "").trim().slice(0, 240);
      ctaNar = String(j.cn || "").trim().slice(0, 220);
      if (Array.isArray(j.bullets)) {
        // terima bentuk baru {t, anim, img, n} DAN bentuk lama string biasa
        const parsed = (j.bullets as unknown[]).slice(0, 12).map((b) => {
          if (typeof b === "string") return { t: b.trim(), a: "", g: "", n: "" };
          const o = (b || {}) as { t?: unknown; anim?: unknown; img?: unknown; n?: unknown };
          return {
            t: String(o.t ?? "").trim(),
            a: String(o.anim ?? "").trim(),
            g: String(o.img ?? "").replace(/["\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60),
            n: String(o.n ?? "").trim().slice(0, 300),
          };
        }).filter((x) => x.t);
        items = parsed.map((x) => x.t);
        anims = parsed.map((x) => x.a);
        imgsP = parsed.map((x) => x.g);
        bulletNars = parsed.map((x) => x.n);
      } else items = [];
      if (!items.length) throw new Error("mode AI: bullets kosong dari LLM — jalankan ulang");
      cta = String(j.cta || "FOLLOW SEKARANG").slice(0, 40);
      log(`[ai] hasil: judul "${judul}" · ${items.length} poin · CTA "${cta}" · anim: ${anims.filter(Boolean).join(",") || "auto"}`);
    } else {
      judul = (inputs.judul || "VIRALIN").toUpperCase().slice(0, 40);
      items = (inputs.bullets || "").split(/\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 12);
      cta = (inputs.cta || "").slice(0, 40);
    }
    const warna = (["green", "blue", "orange", "pink"].includes(inputs.warna || "") ? inputs.warna : "green") as WarnaId;
    const sfxOn = (inputs.sfx || "ya") !== "tidak";
    const animsLine = anims.filter(Boolean).length === items.length ? anims.join("\n") : "";
    const props: MotionStudioProps = {
      judul, bullets: items.join("\n"), cta, warna, sfx: sfxOn,
      ...(animsLine ? { anims: animsLine } : {}),
      ...(inputs.hookdur ? { hookdur: inputs.hookdur } : {}),
      ...(inputs.bulletdur ? { bulletdur: inputs.bulletdur } : {}),
      ...(inputs.ctadur ? { ctadur: inputs.ctadur } : {}),
    };
    // Ilustrasi AI per poin (mode AI/Berita) — latar scene menggambarkan topik masing-masing
    if ((inputs.mode || "manual") !== "manual" && (inputs.ilustrasi || "ya") !== "tidak" && imgsP.some(Boolean)) {
      await fs.mkdir(path.join(process.cwd(), "public", "motion"), { recursive: true });
      const tag = path.basename(dir);
      const rels: string[] = [];
      let made = 0;
      for (let i = 0; i < items.length; i++) {
        const pr = (imgsP[i] || "").slice(0, 60);
        if (!pr) { rels.push(""); continue; }
        const rel = `motion/${tag}-${i}.png`;
        try {
          await mk.zaiImage(`ilustrasi ${pr}, gaya poster flat minimalis modern, warna mencolok, tanpa teks`,
            path.join(process.cwd(), "public", rel), log);
          rels.push(rel); made++;
        } catch (e) {
          rels.push("");
          log(`[ilustrasi] poin ${i + 1} gagal — lewati (${String((e as Error)?.message || e).slice(0, 60)})`);
        }
      }
      if (made) props.imgs = rels.join("\n");
      log(`[ilustrasi] ${made}/${items.length} latar AI dibuat`);
    }
    // NARASI Edge TTS — teks besar = gambaran besar; detailnya dibacakan suara dan
    // muncul sebagai caption karaoke sinkron (timing dari whisper).
    // Sumber teks: form narasi > field `n` dari LLM (mode AI/Berita) > LLM auto (mode Manual).
    let narrMp3 = "";
    const narLines = (inputs.narasi || "").split(/\n+/).map((s) => s.trim());
    const narmode = (inputs.narmode || "tidak");
    if (narmode !== "tidak" || narLines.some(Boolean)) {
      const nSec = 1 + items.length + 1; // hook + tiap poin + CTA
      let narr: string[];
      if (narLines.some(Boolean)) {
        narr = Array.from({ length: nSec }, (_, i) => narLines[i] || "");
        log(`[narasi] teks dari form (${narLines.filter(Boolean).length}/${nSec} bagian)`);
      } else if (hookNar || ctaNar || bulletNars.some(Boolean)) {
        narr = [hookNar, ...items.map((_, i) => bulletNars[i] || ""), ctaNar];
        log("[narasi] teks dari LLM (field n — mode AI/Berita)");
      } else {
        log("[narasi] LLM menyusun narasi per bagian…");
        const raw2 = await mk.llmChat(
          "Kamu penulis naskah video pendek Indonesia. Dari struktur motion graphic berikut, tulis NARASI voice-over " +
          "per bagian: bagian 1 pembuka (hook), bagian 2 dst tiap poin, bagian terakhir ajakan penutup. Bahasa santai " +
          "mengalir, 1-2 kalimat per bagian, langsung isi tanpa basa-basi. Balas HANYA JSON valid: " +
          `{"nar":["bagian 1","bagian 2",…]} — jumlah elemen PERSIS ${nSec} sesuai urutan.`,
          JSON.stringify({ judul, bullets: items, cta }), log);
        const m2 = raw2.match(/\{[\s\S]*\}/);
        if (!m2) throw new Error("narasi auto: LLM tidak membalas JSON — isi narasi manual atau coba lagi");
        let j2: { nar?: unknown };
        try { j2 = JSON.parse(m2[0]); } catch { throw new Error("narasi auto: JSON LLM rusak — coba lagi atau isi manual"); }
        const arr = Array.isArray(j2.nar) ? (j2.nar as unknown[]).map((x) => String(x ?? "").trim()) : [];
        narr = Array.from({ length: nSec }, (_, i) => arr[i] || "");
      }
      if (narr.some(Boolean)) {
        const voice = inputs.voice || "id-ID-ArdiNeural";
        const formDurs = motionSectionDurs(props);
        const LEAD = 0.35, TAIL = 0.55; // napas sebelum/sesudah narasi di tiap bagian
        const durs: number[] = []; const mp3s: string[] = []; const delays: number[] = [];
        let acc = 0;
        for (let i = 0; i < nSec; i++) {
          if (!narr[i]) { durs.push(formDurs[i]); }
          else {
            const mp3 = path.join(dir, `nar-${i}.mp3`);
            try {
              await mk.ttsSynth(narr[i], voice, mp3, "+0%", log);
              const d = await mk.probeDur(mp3);
              mp3s.push(mp3);
              delays.push(Math.round((acc + LEAD) * 1000));
              // scene memanjang kalau narasinya lebih panjang dari durasi form
              durs.push(Math.max(formDurs[i], Math.round((d + LEAD + TAIL) * 20) / 20));
            } catch (e) {
              durs.push(formDurs[i]);
              log(`[narasi] bagian ${i + 1} gagal — lanjut tanpa narasi (${String((e as Error)?.message || e).slice(0, 60)})`);
            }
          }
          acc += durs[i];
        }
        props.durs = durs.join(",");
        if (mp3s.length) {
          // satu track narasi: tiap bagian di-delay ke posisi awal scene-nya (adelay + amix)
          narrMp3 = path.join(dir, "narasi.mp3");
          const fc = mp3s.map((_, k) => `[${k}:a]adelay=${delays[k]}:all=1[d${k}]`).join(";") +
            `;${mp3s.map((_, k) => `[d${k}]`).join("")}amix=inputs=${mp3s.length}:normalize=0:duration=longest[a]`;
          const r = await run(["ffmpeg", "-y", "-hide_banner",
            ...mp3s.flatMap((f) => ["-i", f]), "-filter_complex", fc, "-map", "[a]",
            "-c:a", "libmp3lame", "-q:a", "4", narrMp3]);
          if (r.code !== 0) throw new Error("track narasi gagal: " + tailErr(r.stderr));
          // whisper → timing kata utk caption karaoke (absolut, timeline video)
          const wav = await mk.extractAudio(narrMp3, dir);
          const info = await mk.transcribe(wav, dir, log);
          const narrWords = info.segments.flatMap((s) => s.words || []);
          props.words = JSON.stringify(narrWords.map((w) => ({ w: w.word, s: w.start, e: w.end })));
          log(`[narasi] ${mp3s.length}/${nSec} bagian bersuara · ${narrWords.length} kata caption`);
        }
      }
    }
    // Untuk RENDER: gambar per-job tidak ada di snapshot bundle (bundle dibuat sekali
    // di awal proses, gambar ditulis belakangan) → arahkan renderer ke URL live dari
    // server app (/api/asset membaca disk saat request). Player browser tetap pakai
    // path relatif via staticFile (public/ Next dilayani live di sisi client).
    let renderProps = props;
    if (props.imgs) {
      renderProps = {
        ...props,
        imgs: (props.imgs || "").split("\n").map((p) => (p ? `http://127.0.0.1:3000/api/asset/${p}` : "")).join("\n"),
      };
    }
    log(`[remotion] hook "${judul}" · ${items.length} poin · CTA "${cta}" · tema ${warna}${sfxOn ? " +sfx" : ""}`);
    // pastikan font tersedia di public/ (recycle bisa menghapusnya — copy ulang)
    const fontDst = path.join(process.cwd(), "public", "fonts", "Montserrat-ExtraBold.ttf");
    if (!(await fs.stat(fontDst).catch(() => null))) {
      await fs.mkdir(path.dirname(fontDst), { recursive: true });
      await fs.copyFile(path.join(process.cwd(), "assets", "caption-fonts", "Montserrat-ExtraBold.ttf"), fontDst);
    }
    const { ensureBrowser } = await import("@remotion/renderer");
    await ensureBrowser();
    log("[remotion] chrome headless siap — bundling komposisi…");
    if (!bundleCache) {
      const { bundle } = await import("@remotion/bundler");
      // publicDir → staticFile() di komposisi menyajikan font & SFX sama-origin
      bundleCache = await bundle({
        entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
        publicDir: path.join(process.cwd(), "public"),
      });
      log("[remotion] bundle siap (di-cache untuk job berikutnya)");
    }
    const { selectComposition, renderMedia } = await import("@remotion/renderer");
    const comp = await selectComposition({ serveUrl: bundleCache, id: "MotionStudio", inputProps: renderProps });
    const out = path.join(dir, "motion-studio.mp4");
    log(`[remotion] render ${Math.round((comp.durationInFrames / comp.fps) * 10) / 10}s @${comp.fps}fps…`);
    let last = 0;
    await renderMedia({
      composition: comp, serveUrl: bundleCache, codec: "h264", outputLocation: out,
      inputProps: renderProps,
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 100);
        if (pct >= last + 25) { last = Math.min(pct - (pct % 25), 75); log(`[remotion] render ${last + 25}%`); }
      },
    });
    // mux narasi + SFX komposisi — VO dominan (amix normalize=0), alimiter jaga peak
    if (narrMp3) {
      const final = path.join(dir, "motion-final.mp4");
      log("[mux] narasi + sfx + video…");
      const fc = "[0:a]volume=0.75[sfx];[1:a]volume=1[vo];[sfx][vo]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]";
      const m = await run(["ffmpeg", "-y", "-hide_banner", "-i", out, "-i", narrMp3,
        ...(sfxOn ? ["-filter_complex", fc, "-map", "0:v", "-map", "[a]"] : ["-map", "0:v", "-map", "1:a"]),
        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", final]);
      if (m.code === 0) await fs.rename(final, out);
      else log(`[mux] narasi gagal di-gabung — video tetap tanpa suara (${tailErr(m.stderr).slice(0, 80)})`);
    }
    const st = await fs.stat(out);
    job.files.push({ file: "motion-studio.mp4", label: `Motion Studio — ${judul}`, kind: "video" });
    job.title = `Motion Studio (Remotion) — ${judul}`;
    log(`[remotion] jadi (${(st.size / 1e6).toFixed(2)} MB)`);
  }

  async function kontenTempel(_d: string, log: Log): Promise<void> {
    const { VIRAL_FPS, VIRAL_HIGHLIGHT, VIRAL_RAGE_HIGHLIGHT, alignScenes } = (await import("./viral"));
    const presetId = inputs.preset || job.captionPreset || "bold-impact";
    // mode rage-bait (tool "ragebait"): hook provokatif + momen bernomor gue/lu,
    // aksen merah, chip MOMEN x/y, ilustrasi komik, TTS cepat (+12%) — gaya terkunci
    const rage = job.tool === "ragebait" || inputs.gaya === "rage";
    let juduls: string[] = [];
    // 1. Naskah terstruktur: LLM → JSON {hook, points[], cta}; naskah manual → split kalimat
    let hook = "", cta = "";
    let points: string[] = [];
    const manual = (inputs.naskah || "").trim();
    if (manual) {
      const kal = manual.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
      hook = kal.shift() || "";
      const last = kal[kal.length - 1] || "";
      if (kal.length > 1 && /follow|ikuti|subscribe|komen|dm|share|simpan/i.test(last)) cta = kal.pop() as string;
      points = kal.slice(0, 4);
    } else {
      const topik = (inputs.topik || "").trim();
      if (!topik) throw new Error("isi topik ATAU naskah");
      const raw = await mk.llmChat(
        rage
          ? 'Kamu penulis naskah short rage-bait viral Indonesia (ala video "3 Kelakuan Orang +62 Paling Bikin Emosi", durasi target 40-60 detik). HOOK = judul rage-bait maks 9 kata yang provokatif memancing emosi, diawali angka. 3 MOMEN: narasi masing-masing 2-3 kalimat (25-40 kata per momen) gaya santai gue/lu, ceritakan kelakuan step-by-step sampai punchline emosi. Kelakuannya WAJIB sopan-tapi-nyebelin yang relatable (mis. kaki di sandaran, potong antri, telpon speaker keras, rebutan kursi, sampah sembarangan) — DILARANG konten kotor/kemunasinan (kencing, pup, ludah, dll) dan tanpa nama orang nyata. Plus JUDUL MOMEN masing-masing 2-4 kata KAPITAL. CTA maks 6 kata. Keluarkan HANYA JSON valid tanpa markdown: {"hook":"...","points":["momen 1","momen 2","momen 3"],"juduls":["JUDUL 1","JUDUL 2","JUDUL 3"],"cta":"..."}'
          : 'Kamu penulis naskah video viral TikTok/Reels Indonesia. HOOK maks 8 kata yang bikin berhenti scroll (bisa provokatif/angka/pertanyaan), 3 POIN masing-masing maks 16 kata padat & spesifik, CTA maks 6 kata. Keluarkan HANYA JSON valid tanpa markdown: {"hook":"...","points":["...","...","..."],"cta":"..."}',
        `Topik: ${topik}`, log);
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        const j = JSON.parse(m ? m[0] : raw) as { hook?: string; points?: unknown[]; juduls?: unknown[]; cta?: string };
        hook = (j.hook || "").trim();
        points = (Array.isArray(j.points) ? j.points : []).map((x) =>
          typeof x === "string" ? x.trim() : String((x as { t?: unknown })?.t ?? "").trim()).filter(Boolean).slice(0, 4);
        juduls = (Array.isArray(j.juduls) ? j.juduls : []).map((x) =>
          String(x ?? "").trim().toUpperCase().slice(0, 24)).filter(Boolean).slice(0, 4);
        cta = (j.cta || "").trim();
      } catch { /* fallback di bawah */ }
      if (!hook) { // LLM nggak kasih JSON → raw text dibagi kalimat
        const kal = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
        hook = kal.shift() || topik;
        points = kal.slice(0, 4);
        cta = "FOLLOW UNTUK KONTEN SEPERTI INI";
      }
    }
    if (!hook) throw new Error("naskah kosong");
    const texts = [hook, ...points, ...(cta ? [cta] : [])];
    const kinds = ["hook", ...points.map(() => "poin"), ...(cta ? ["cta" as const] : [])] as ("hook" | "poin" | "cta")[];
    const naskah = texts.join(" ");
    job.texts.push({ label: "Naskah voiceover", body: naskah });
    log(`[struktur] hook "${hook.slice(0, 44)}" · ${points.length} poin · CTA "${cta.slice(0, 32)}"`);
    // 2. TTS + whisper word-timing → batas scene presisi (bukan tebak per detik)
    const speech = path.join(dir, "speech.mp3");
    await mk.ttsSynth(naskah, inputs.voice || "id-ID-ArdiNeural", speech, rage ? "+12%" : "+0%", log);
    const wav = await mk.extractAudio(speech, dir);
    const info = await mk.transcribe(wav, dir, log);
    const words: Word[] = info.segments.flatMap((s) => s.words || []);
    const dur = info.duration + 0.8;
    const bounds = alignScenes(texts, words, dur, info.segments.map((s) => s.end));
    // 3. Latar per scene: hook + tiap poin gambar sendiri (CTA pakai ulang hook) — visual berganti terus
    const pubDir = path.join(process.cwd(), "public", "konten", job.id);
    await fs.mkdir(pubDir, { recursive: true });
    const GRADS = [["0x0b0b0b", "0x123524"], ["0x0b0b14", "0x312e81"], ["0x140b0b", "0x7f1d1d"], ["0x0f0b14", "0x581c87"]];
    const imgs: string[] = [];
    for (let i = 0; i < texts.length; i++) {
      if (kinds[i] === "cta" && imgs[0]) { imgs.push(imgs[0]); continue; }
      const f = path.join(pubDir, `scene-${i}.png`);
      if ((inputs.bg || "ai") === "ai" && kinds[i] !== "cta") {
        const desc = kinds[i] === "hook"
          ? rage
            ? `adegan kelakuan penumpang nyebelin di kendaraan umum: ${inputs.topik || hook}`
            : `latar dramatis sinematik untuk video tentang: ${inputs.topik || hook}`
          : rage
            ? `momen kelakuan nyebelin: ${texts[i]}`
            : `latar ilustratif untuk narasi tentang: ${texts[i]}`;
        try {
          await mk.zaiImage(
            rage
              ? `Ilustrasi kartun digital vertikal 9:16 menggambarkan adegan: ${desc}. Komposisi bervariasi (wide/medium/close-up, latar konteks kejadian terlihat jelas), ekspresi wajah berlebihan, warna kontras mencolok. SANGAT PENTING: gambar TANPA teks sama sekali — tanpa huruf, tanpa angka, tanpa balon kata, tanpa tulisan bahasa apapun, tanpa logo atau watermark; area bawah gelap polos agar caption terbaca.`
              : `Background sinematik vertikal 9:16, kontras tinggi, ${desc}. SANGAT PENTING: jangan menulis teks, huruf, angka, atau karakter tulisan apapun di dalam gambar; tanpa watermark; komposisi bersih; gelap di tengah-bawah agar caption terbaca.`,
            f, log);
        } catch (e) {
          log(`[latar] scene ${i} gagal — pakai gradient (${String((e as Error)?.message || e).slice(0, 50)})`);
        }
      }
      if (!(await fs.stat(f).catch(() => null))) {
        const [c0, c1] = GRADS[i % GRADS.length];
        const g = await run(["ffmpeg", "-y", "-hide_banner", "-f", "lavfi",
          "-i", `gradients=s=540x960:c0=${c0}:c1=${c1}:duration=1`, "-frames:v", "1", f]);
        if (g.code !== 0) throw new Error("gradient gagal: " + tailErr(g.stderr));
      }
      // renderer server → URL live /api/asset (file ditulis setelah bundle dibuat)
      imgs.push(`http://127.0.0.1:3000/api/asset/konten/${job.id}/scene-${i}.png`);
    }
    // font Anton utk caption Hormozi — recycle bisa menghapus public/fonts
    const antonDst = path.join(process.cwd(), "public", "fonts", "Anton-Regular.ttf");
    if (!(await fs.stat(antonDst).catch(() => null))) {
      await fs.mkdir(path.dirname(antonDst), { recursive: true });
      await fs.copyFile(path.join(process.cwd(), "assets", "caption-fonts", "Anton-Regular.ttf"), antonDst);
    }
    // 4. Render Remotion: hook punch-in + Ken Burns + karaoke + progress bar + CTA
    const props: ViralKontenProps = {
      fps: VIRAL_FPS,
      highlight: rage ? VIRAL_RAGE_HIGHLIGHT : VIRAL_HIGHLIGHT,
      ...(rage ? { gaya: "rage" as const } : {}),
      words: words.map((w) => ({ w: w.word, s: w.start, e: w.end })),
      scenes: texts.map((text, i) => ({
        kind: kinds[i], text, img: imgs[i], start: bounds[i].start, end: bounds[i].end,
        // judul momen (mode rage): juduls[0] → poin pertama, dst.
        ...(rage && juduls[i - 1] ? { judul: juduls[i - 1] } : {}),
      })),
    };
    const { ensureBrowser } = await import("@remotion/renderer");
    await ensureBrowser();
    log("[remotion] chrome headless siap — bundling komposisi…");
    if (!bundleCache) {
      const { bundle } = await import("@remotion/bundler");
      bundleCache = await bundle({
        entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
        publicDir: path.join(process.cwd(), "public"),
      });
      log("[remotion] bundle siap (di-cache untuk job berikutnya)");
    }
    const { selectComposition, renderMedia } = await import("@remotion/renderer");
    const comp = await selectComposition({ serveUrl: bundleCache, id: "ViralKonten", inputProps: props });
    const visual = path.join(dir, "viral-visual.mp4"); // video + track SFX dari komposisi
    log(`[remotion] render ${Math.round((comp.durationInFrames / comp.fps) * 10) / 10}s @${comp.fps}fps…`);
    let last = 0;
    await renderMedia({
      composition: comp, serveUrl: bundleCache, codec: "h264", outputLocation: visual,
      inputProps: props,
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 100);
        if (pct >= last + 25) { last = Math.min(pct - (pct % 25), 75); log(`[remotion] render ${last + 25}%`); }
      },
    });
    // 5. Mux: voiceover (fade-out) + track SFX komposisi — amix normalize=0 supaya
    //    level VO tidak terbagi 2; alimiter jaga peak saat whoosh tumpang suara
    const out = path.join(dir, "konten-viral.mp4");
    log("[mux] suara + sfx + video…");
    const fc = "[1:a]afade=t=out:st=" + Math.max(dur - 0.8, 0) + ":d=0.8[vo];" +
      "[0:a]volume=0.9[sfx];[sfx][vo]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]";
    const m = await run(["ffmpeg", "-y", "-hide_banner", "-i", visual, "-i", speech,
      "-filter_complex", fc, "-map", "0:v", "-map", "[a]", "-t", String(dur),
      "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out]);
    if (m.code !== 0) throw new Error("mux gagal: " + tailErr(m.stderr));
    const st = await fs.stat(out);
    await fs.rm(pubDir, { recursive: true, force: true }).catch(() => {});
    await thumb(dir, out, "th-konten.jpg");
    job.clips.push({ file: "konten-viral.mp4", thumb: "th-konten.jpg", start: 0,
      end: Math.round(dur * 10) / 10, seconds: Math.round(dur * 10) / 10, bytes: st.size,
      title: (hook.slice(0, 50) || "Konten Viral"), lines: words.length, preset: presetId });
    job.title = `${rage ? "Rage Bait Studio" : "VIRAL Content Creator"} — ${hook.slice(0, 40)}`;
    log(`[konten] jadi ${Math.round(dur)}s, ${texts.length} scene${rage ? " · rage-bait" : ""} (${(st.size / 1e6).toFixed(2)} MB)`);
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
    const raw = await mk.llmChat(
      "Kamu ahli judul viral pasar Indonesia. Balas HANYA JSON: {\"judul\":[{\"t\":\"...\",\"skor\":0-100,\"alasan\":\"...\"}]} — 8 judul terbaik, terurut skor tertinggi. Judul maks 70 karakter.",
      `Judul sekarang: "${inputs.judul}". Platform: ${platform}. Berikan 8 alternatif judul dengan skor potensi klik.`, log);
    const j = mk.extractJson<{ judul: Array<{ t: string; skor: number; alasan: string }> }>(raw);
    const lines = j.judul.map((x, i) => `${i + 1}. [skor ${x.skor}] ${x.t}\n   ↳ ${x.alasan}`).join("\n");
    job.texts.push({ label: "8 Judul Optimal (LLM gratis GLM)", body: lines });
    job.title = "Optimasi Judul";
    log("[judul] 8 alternatif siap");
  }

  async function viralTips(_d: string, log: Log): Promise<void> {
    const raw = await mk.llmChat(
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
    const out = await mk.llmChat(
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
