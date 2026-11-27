/** Tool "motion-studio" (Motion Studio — engine Remotion).
 *  Diport 1:1 dari toolrun.ts monolitik (sebelum refactor efisiensi memecah
 *  per-tool) ke kontrak ToolCtx arsitektur lib/tools/. Perilaku render tetap
 *  sama: struktur hook/bullet/CTA (manual / AI / berita) → ilustrasi AI per
 *  poin → narasi Edge TTS + caption karaoke (whisper) → bundle Remotion sekali
 *  (di-cache antar job) → renderMedia → mux narasi + SFX komposisi.
 *
 *  Catatan render: gambar per-job ditulis SETELAH bundle dibuat → renderer
 *  diarahkan ke URL live /api/asset (baca disk saat request), bukan staticFile.
 */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "../mediakit";
import { run as runCmd, tailErr } from "../exec";
import { motionSectionDurs, type MotionStudioProps, type WarnaId } from "../motion";
import { gdriveConfigured, gdriveUpload } from "../storage-drive";
import type { ToolCtx } from "./_shared";

/** Bundle Remotion di-cache lintas job (entry remotion/index.ts + publicDir). */
let bundleCache: string | null = null;

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
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
        const { newsHeadlines } = await import("../berita");
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
    const raw = await mk.zaiChat(
      "Kamu penulis konten short-video viral Indonesia. Susun struktur Motion Studio dari bahan yang diberikan. " +
      (isBerita
        ? "Bahan di bawah adalah headline berita NYATA — buat versi viralnya TANPA mengarang fakta tambahan; sudut pandang/opini boleh. "
        : "") +
      "Balas HANYA JSON valid tanpa penjelasan: {\"judul\":\"HOOK KAPITAL maks 40 karakter\", " +
      "\"n\":\"1 kalimat narasi pembuka yg menjelaskan hook (yg dibaca voice-over)\", " +
      "\"bullets\":[{\"t\":\"poin pendek maks 60 karakter TANPA titik di akhir\",\"anim\":\"money\",\"img\":\"deskripsi visual 2-5 kata\"," +
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
    if (!items.length) throw new Error("mode Manual: isi minimal 1 poin (satu per baris)");
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
      const raw2 = await mk.zaiChat(
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
        const r = await runCmd(["ffmpeg", "-y", "-hide_banner",
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
  // Port dari env — jangan hardcode 3000 (platform/VPS bisa pakai port lain).
  const assetPort = process.env.PORT || "3000";
  let renderProps = props;
  if (props.imgs) {
    renderProps = {
      ...props,
      imgs: (props.imgs || "").split("\n").map((p) => (p ? `http://127.0.0.1:${assetPort}/api/asset/${p}` : "")).join("\n"),
    };
  }
  log(`[remotion] hook "${judul}" · ${items.length} poin · CTA "${cta}" · tema ${warna}${sfxOn ? " +sfx" : ""}`);
  // Font di public/fonts ter-commit di repo — tidak ada copy runtime lagi.
  // (Dulu hanya Montserrat yang dicopy, Anton tidak ke-restore habis recycle.)
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
    const m = await runCmd(["ffmpeg", "-y", "-hide_banner", "-i", out, "-i", narrMp3,
      ...(sfxOn ? ["-filter_complex", fc, "-map", "0:v", "-map", "[a]"] : ["-map", "0:v", "-map", "1:a"]),
      "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", final]);
    if (m.code === 0) await fs.rename(final, out);
    else log(`[mux] narasi gagal di-gabung — video tetap tanpa suara (${tailErr(m.stderr).slice(0, 80)})`);
  }
  const st = await fs.stat(out);
  // simpanDrive "ya" + kredensial VL_GDRIVE_* terpasang → upload hasil ke Google
  // Drive; link share muncul di panel hasil job (JobPanel membaca files[].link)
  let driveLink = "";
  if ((inputs.simpanDrive || "tidak") === "ya") {
    if (gdriveConfigured()) {
      try {
        driveLink = await gdriveUpload(out, `motion-studio-${judul.toLowerCase().replace(/\s+/g, "-")}.mp4`, log);
        log(`[drive] hasil di-upload → ${driveLink}`);
      } catch (e) {
        log(`[drive] upload gagal — hasil tetap di server (${String((e as Error)?.message || e).slice(0, 70)})`);
      }
    } else {
      log("[drive] VL_GDRIVE_* belum diset di env — hasil tetap di server");
    }
  }
  job.files!.push({
    file: "motion-studio.mp4", label: `Motion Studio — ${judul}`, kind: "video",
    ...(driveLink ? { link: driveLink } : {}),
  });
  job.title = `Motion Studio (Remotion) — ${judul}`;
  log(`[remotion] jadi (${(st.size / 1e6).toFixed(2)} MB)`);
}
