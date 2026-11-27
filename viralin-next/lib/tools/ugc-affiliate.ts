/** Tool "ugc-affiliate" — TIRU KONTEN viral → paket UGC produk affiliate TikTok.
 *  Alur: (0) siapkan avatar (upload ATAU generate AI dari prompt) + foto produk
 *  → (1) unduh video referensi → (2) transkrip whisper → (3) LLM bedah struktur
 *  (hook / beat / CTA / kenapa viral) → (4) LLM tulis naskah UGC BARU dengan struktur
 *  yang ditiru untuk produk affiliate user → (5) LLM susun shot-list STORYBOARD
 *  (frame bernomor terhubung garis waktu, gaya resep storyboard HyperFrames)
 *  → (6) gambar AI per frame (mode "ai") → (7) voiceover TTS + caption SRT.
 *  Semua stack gratis: yt-dlp · faster-whisper · edge-tts · z-ai LLM · z-ai image.
 *
 *  Catatan etik: meniru STRUKTUR/format video (hook-beat-CTA) — bukan menyalin
 *  kata-kata penulis asli. Naskah selalu ditulis baru untuk produk user. */
import path from "path";
import { promises as fs } from "fs";
import * as mk from "../mediakit";
import { run as execRun, tailErr } from "../exec";
import { FONTS_DIR } from "../config";
import { persist } from "../store";
import { num, toSrt, tsSrt, type ToolCtx } from "./_shared";

type Beat = { detik_mulai: number; detik_selesai: number; fungsi: string; ringkasan: string };
type Bedah = {
  hook_asli: string;
  gaya: string;
  kenapa_viral: string;
  struktur: Beat[];
  cta_asli: string;
};
type Baris = { detik_mulai: number; detik_selesai: number; teks: string };
type Naskah = {
  judul: string;
  baris: Baris[];
  hook_alternatif: string[];
  hashtag: string[];
  tips_posting: string;
};

/** Satu frame storyboard: nomor, rentang waktu, peran (hook/isi/CTA), jenis shot,
 *  deskripsi visual, teks overlay, aksi avatar, apakah produk tampil di frame. */
type Shot = {
  peran: string;
  shot: string;
  visual: string;
  overlay: string;
  aksi: string;
  produk_tampil: boolean;
};
type Papan = { gaya_visual: string; shots: Shot[] };

type Log = (l: string) => void;

const VOICES = ["id-ID-ArdiNeural", "id-ID-GadisNeural", "en-US-AndrewMultilingualNeural", "en-US-AvaMultilingualNeural"];

/* ── helper ──────────────────────────────────────────────────────────── */

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Salin file hasil upload (ref "<uploadId>:nama" dari /api/upload) ke destBase.
 *  Ekstensi asli dipertahankan agar MIME benar saat disajikan. Return basename. */
async function copyUpload(ref: string, destBase: string, log: Log): Promise<string | null> {
  const raw = (ref || "").trim();
  if (!raw) return null;
  const upId = (raw.startsWith("<uploadId>:") ? raw.slice(11) : raw).replace(/[^a-zA-Z0-9._-]/g, "");
  const from = path.join(mk.UPLOAD_DIR, upId);
  if (!(await fs.stat(from).then(() => true).catch(() => false))) {
    log(`[aset] upload tidak ditemukan: ${upId} — diabaikan`);
    return null;
  }
  const ext = path.extname(upId) || ".png";
  const dest = destBase + ext;
  await fs.copyFile(from, dest);
  log(`[aset] pakai upload ${upId} (${((await fs.stat(from)).size / 1024).toFixed(0)} KB)`);
  return path.basename(dest);
}

/* ── builder storyboard.html — frame cards terhubung garis waktu ─────── */

function buildStoryboardHtml(opts: {
  produk: string;
  durasiTotal: number;
  gayaVisual: string;
  avatarFile?: string;
  produkFile?: string;
  avatarSumber: string;
  frames: Array<{
    no: number;
    detikMulai: number;
    detikSelesai: number;
    peran: string;
    shot: string;
    visual: string;
    overlay: string;
    aksi: string;
    teksNaskah: string;
    img?: string;
  }>;
  refUrl: string;
}): string {
  const { produk, durasiTotal, gayaVisual, avatarFile, produkFile, avatarSumber, frames, refUrl } = opts;

  // kartu per frame + heading act saat peran berubah (hook → isi → cta)
  const shown = new Set<string>();
  const cards = frames
    .map((f) => {
      const peranKey = f.peran.toLowerCase().includes("hook")
        ? "HOOK"
        : f.peran.toLowerCase().includes("cta")
          ? "CTA"
          : "ISI";
      const act = shown.has(peranKey) ? "" : `<div class="act">BAGIAN — ${peranKey}</div>`;
      shown.add(peranKey);
      const visualEl = f.img
        ? `<img class="fthumb" src="${f.img}" loading="lazy" alt="Frame ${f.no} — ${esc(f.shot)}" />`
        : `<div class="fthumb fempty">sketsa frame<br/>tidak tersedia</div>`;
      return `${act}
<div class="frame">
  <div class="rail"><div class="node">${String(f.no).padStart(2, "0")}</div></div>
  <div class="card">
    <div class="fmeta">
      <span class="ftime">${f.detikMulai}–${f.detikSelesai}s</span>
      <span class="fshot">${esc(f.shot)}</span>
      <span class="fperan p-${peranKey.toLowerCase()}">${peranKey}</span>
    </div>
    <div class="fbody">
      ${visualEl}
      <div class="ftext">
        ${f.overlay ? `<div class="foverlay">${esc(f.overlay)}</div>` : ""}
        <p class="fvisual">${esc(f.visual)}</p>
        ${f.aksi ? `<p class="faksi">Aksi avatar: ${esc(f.aksi)}</p>` : ""}
        ${f.teksNaskah ? `<blockquote class="fnaskah">"${esc(f.teksNaskah)}"</blockquote>` : ""}
      </div>
    </div>
  </div>
</div>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Storyboard UGC — ${esc(produk)}</title>
<style>
  :root { --line:#d8d3ca; --ink:#1c1a17; --dim:#6f6a62; --acc:#0a7d4f; --card:#ffffff; --bg:#f5f2ec; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
         font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 28px 16px 56px; }
  header.hero { background:var(--card); border:1px solid var(--line); border-radius:14px;
                padding:18px 20px; display:flex; gap:14px; flex-wrap:wrap; align-items:center; }
  .hero img.av, .hero img.pd { width:64px; height:64px; object-fit:cover; border-radius:12px; border:1px solid var(--line); }
  .hero h1 { margin:0 0 4px; font-size:19px; }
  .hero p { margin:0; color:var(--dim); font-size:13px; }
  .chip { display:inline-block; background:#efe9df; border-radius:999px; padding:2px 10px;
          font-size:12px; color:var(--ink); margin-right:6px; margin-top:6px; }
  .board { margin-top: 26px; }
  .act { font-weight:800; letter-spacing:.12em; font-size:12px; color:var(--acc);
         margin:26px 0 10px 2px; }
  .frame { display:grid; grid-template-columns:44px 1fr; }
  .rail { position:relative; }
  .rail::before { content:""; position:absolute; left:20px; top:-14px; bottom:-14px;
                  width:2px; background:var(--line); }
  .frame:first-of-type .rail::before { top:18px; }
  .frame:last-of-type .rail::before { bottom:auto; height:18px; }
  .node { position:relative; z-index:1; width:42px; height:42px; margin-top:6px;
          border-radius:50%; background:var(--ink); color:#fff; display:flex;
          align-items:center; justify-content:center; font-weight:700; font-size:13px;
          border:3px solid var(--bg); }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px;
          padding:12px 14px; margin:10px 0 10px 6px; box-shadow:0 1px 2px rgba(0,0,0,.04); }
  .fmeta { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .ftime { font-weight:700; font-size:13px; background:#efe9df; border-radius:6px; padding:2px 8px; }
  .fshot { color:var(--dim); font-size:13px; }
  .fperan { font-size:11px; font-weight:800; letter-spacing:.08em; border-radius:999px; padding:2px 9px; }
  .p-hook { background:#0a7d4f; color:#fff; }
  .p-isi { background:#e7e1d6; color:var(--ink); }
  .p-cta { background:#b3452e; color:#fff; }
  .fbody { display:grid; grid-template-columns:150px 1fr; gap:12px; margin-top:10px; }
  .fthumb { width:150px; height:266px; object-fit:cover; border-radius:10px; border:1px solid var(--line); }
  .fempty { display:flex; align-items:center; justify-content:center; text-align:center;
            background:repeating-linear-gradient(45deg,#efe9df,#efe9df 8px,#f5f2ec 8px,#f5f2ec 16px);
            color:var(--dim); font-size:12px; }
  .foverlay { display:inline-block; background:var(--ink); color:#fff; border-radius:8px;
              padding:4px 10px; font-weight:700; font-size:13px; }
  .fvisual { margin:8px 0 4px; }
  .faksi { margin:2px 0; color:var(--dim); font-size:13px; }
  .fnaskah { margin:8px 0 0; border-left:3px solid var(--acc); padding:2px 0 2px 10px;
             font-style:italic; color:#33302b; }
  footer.note { margin-top:30px; color:var(--dim); font-size:12px; }
  @media (max-width:640px){ .fbody { grid-template-columns:110px 1fr; } .fthumb{ width:110px;height:195px; } }
  @media print { body { background:#fff; } .card { break-inside:avoid; } }
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    ${avatarFile ? `<img class="av" src="${avatarFile}" alt="Avatar creator" />` : ""}
    ${produkFile ? `<img class="pd" src="${produkFile}" alt="Foto produk" />` : ""}
    <div>
      <h1>Storyboard UGC — ${esc(produk)}</h1>
      <p>${frames.length} frame · total ±${durasiTotal}s · gaya: ${esc(gayaVisual)} · avatar: ${esc(avatarSumber)}</p>
      <span class="chip">Tiru struktur: ${esc(refUrl.slice(0, 60) || "referensi")}</span>
      <span class="chip">Dibuat otomatis Viralin</span>
    </div>
  </header>
  <div class="board">
${cards}
  </div>
  <footer class="note">
    Frame terhubung garis = urutan waktu video. Setiap kartu: jenis shot, deskripsi visual,
    teks overlay di layar, aksi avatar, dan baris naskah yang diucapkan. Meniru struktur, bukan kata-kata.
  </footer>
</div>
</body>
</html>`;
}

/* ── runner ──────────────────────────────────────────────────────────── */

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const produk = (inputs.produk || "").trim();
  if (!produk) throw new Error("Nama produk wajib diisi");
  const cta = (inputs.cta || "Cek keranjang kuning sekarang sebelum promo habis!").trim();
  const niche = (inputs.niche || "").trim();
  const durasi = num(inputs.durasi, 30, 10, 90);
  const voice = VOICES.includes(inputs.voice || "") ? inputs.voice! : VOICES[0];
  const sbMode = inputs.storyboard === "teks" ? "teks" : "ai";
  const avatarPrompt = (inputs.avatar_prompt || "").trim();

  // ── 0. aset visual: avatar (upload / AI) + foto produk ─────────────
  log("[aset] menyiapkan avatar & produk…");
  let avatarFile: string | undefined;
  let avatarSumber = "tanpa avatar";
  const avUp = await copyUpload(inputs.avatar_upload || "", path.join(dir, "avatar-upload"), log);
  if (avUp) {
    avatarFile = avUp;
    avatarSumber = "foto upload user";
  } else if (avatarPrompt) {
    try {
      avatarFile = "avatar.png";
      await mk.zaiImage(
        `${avatarPrompt}. Frame penuh vertikal 9:16, pencahayaan alami, realistis, tanpa teks.`,
        path.join(dir, avatarFile),
        log,
        "768x1344"
      );
      avatarSumber = "generate AI dari prompt";
      log(`[aset] avatar AI selesai (${avatarFile})`);
    } catch (e) {
      avatarFile = undefined;
      log(`[aset] avatar AI gagal (${String((e as Error).message || e).slice(0, 80)}) — storyboard lanjut tanpa gambar avatar`);
    }
  }
  if (avatarFile) {
    job.files!.push({ file: avatarFile, label: `Avatar (${avatarSumber})`, kind: "image" });
    await persist(job);
  }
  let produkFile: string | undefined;
  const pdUp = await copyUpload(inputs.produk_upload || "", path.join(dir, "produk-upload"), log);
  if (pdUp) {
    produkFile = pdUp;
    job.files!.push({ file: produkFile, label: "Foto produk (upload)", kind: "image" });
    await persist(job);
  }

  // ── 1. unduh video referensi ───────────────────────────────────────
  log("[sumber] mengunduh video referensi…");
  await mk.ytdlpFetch(
    [
      "--no-cache-dir", "--no-warnings", "--newline",
      "-S", "res:720", "-N", "4",
      "--merge-output-format", "mp4",
      "-o", path.join(dir, "ref.%(ext)s"),
    ],
    inputs.source,
    inputs.cookies,
    log
  );
  let src = "";
  for (const f of await fs.readdir(dir)) {
    if (f.startsWith("ref.")) src = path.join(dir, f);
  }
  if (!src) throw new Error("file referensi tidak ditemukan setelah unduh");
  if (!src.endsWith(".mp4")) {
    const mp4 = src.replace(/\.\w+$/, ".mp4");
    const rm = await execRun(["ffmpeg", "-y", "-i", src, "-c", "copy", "-movflags", "+faststart", mp4]);
    if (rm.code !== 0) throw new Error("konversi ke mp4 gagal: " + tailErr(rm.stderr));
    src = mp4;
  }
  const pr = await execRun(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", src]);
  const durRef = parseFloat(JSON.parse(pr.stdout).format?.duration || "0");
  log(`[probe] referensi ${Math.round(durRef)}s`);

  // ── 2. transkrip referensi ─────────────────────────────────────────
  const wav = path.join(dir, "ref-audio.wav");
  const ax = await execRun(["ffmpeg", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
  if (ax.code !== 0) throw new Error("ekstrak audio gagal: " + tailErr(ax.stderr));
  const info = await mk.transcribe(wav, dir, log);
  const transkrip = info.segments
    .map((s) => `[${s.start.toFixed(1)}–${s.end.toFixed(1)}s] ${s.text}`)
    .join("\n")
    .slice(0, 5000);

  // ── 3. LLM #1 — bedah struktur konten referensi ────────────────────
  log("[ai] menganalisis struktur konten referensi…");
  const raw1 = await mk.zaiChat(
    'Kamu analis konten viral TikTok/Reels Indonesia. Balas HANYA JSON: {"hook_asli":"...","gaya":"...","kenapa_viral":"...","struktur":[{"detik_mulai":0,"detik_selesai":5,"fungsi":"hook/isi/teaser/CTA","ringkasan":"..."}],"cta_asli":"..."}. ' +
      "struktur = potongan waktu (detik) yang menjelaskan beat video dari awal sampai akhir (5-8 beat). Gaya jelaskan singkat (visual, ritme, tone).",
    `Durasi video: ${Math.round(durRef)}s.\nTranskrip ber-timestamp:\n${transkrip || "(tidak ada ucapan terdeteksi — analisis dari durasi saja, tandai struktur generik)"}`,
    log
  );
  const bedah = mk.extractJson<Bedah>(raw1);
  job.texts!.push({
    label: "Bedah struktur konten referensi",
    body:
      `Hook asli: ${bedah.hook_asli}\nGaya: ${bedah.gaya}\nKenapa viral: ${bedah.kenapa_viral}\nCTA asli: ${bedah.cta_asli}\n\nStruktur:\n` +
      (bedah.struktur || [])
        .map((b) => `  ${b.detik_mulai}–${b.detik_selesai}s · ${b.fungsi} · ${b.ringkasan}`)
        .join("\n"),
  });
  log(`[ai] bedah selesai — ${bedah.struktur?.length ?? 0} beat terdeteksi`);

  // ── 4. LLM #2 — tulis naskah UGC baru utk produk affiliate ─────────
  log("[ai] menulis naskah UGC affiliate baru…");
  const raw2 = await mk.zaiChat(
    'Kamu copywriter UGC TikTok Affiliate Indonesia. Tiru STRUKTUR beat yang diberikan (bukan kata-katanya) untuk membuat naskah video BARU mempromosikan produk user untuk TikTok Shop/keranjang kuning. Balas HANYA JSON: {"judul":"...","baris":[{"detik_mulai":0,"detik_selesai":4,"teks":"..."}],"hook_alternatif":["...","..."],"hashtag":["#..."],"tips_posting":"..."}. ' +
      `Total durasi naskah ±${durasi}s (${Math.ceil(durasi / 3)}-${Math.ceil(durasi / 2)} baris). Bahasa kasual lisan, tanpa tanda baca formal, hook 1-2 baris pertama kuat, sebut manfaat produk konkret, CTA di akhir: "${cta}". tips_posting: jam posting terbaik + ide shot yang diambil. hashtag 5 buah relevan pasar Indonesia.`,
    `Produk: "${produk}"${niche ? `\nNiche akun: "${niche}"` : ""}\n\nStruktur referensi untuk ditiru:\n${(bedah.struktur || [])
      .map((b) => `${b.detik_mulai}-${b.detik_selesai}s: ${b.fungsi}`)
      .join("\n")}\nHook referensi (jangan disalin): "${bedah.hook_asli}"`,
    log
  );
  const naskah = mk.extractJson<Naskah>(raw2);
  if (!naskah.baris?.length) throw new Error("LLM tidak menghasilkan baris naskah");
  const baris: Baris[] = naskah.baris.map((b) => ({
    detik_mulai: Math.max(0, Number(b.detik_mulai) || 0),
    detik_selesai: Math.max(1, Number(b.detik_selesai) || 1),
    teks: String(b.teks || "").slice(0, 300),
  }));

  const naskahBody =
    `${naskah.judul}\n\n` +
    baris.map((b) => `  [${b.detik_mulai}-${b.detik_selesai}s] ${b.teks}`).join("\n") +
    `\n\nHook alternatif:\n${(naskah.hook_alternatif || []).map((h) => `  • ${h}`).join("\n")}` +
    `\n\nHashtag: ${(naskah.hashtag || []).join(" ")}` +
    `\n\nTips posting: ${naskah.tips_posting}` +
    `\n\nCTA: ${cta}`;
  job.texts!.push({ label: `Naskah UGC — ${produk}`, body: naskahBody });
  job.title = `UGC — ${produk}`.slice(0, 60);

  // ── 5. LLM #3 — shot-list storyboard (frame bernomor + garis waktu) ─
  log("[board] menyusun shot-list storyboard…");
  const raw3 = await mk.zaiChat(
    'Kamu sutradara UGC TikTok. Ubah naskah menjadi shot-list storyboard. Balas HANYA JSON: {"gaya_visual":"...","shots":[{"peran":"hook/isi/cta","shot":"selfie medium/close-up wajah/top-down produk/B-roll tangan/OTS","visual":"deskripsi frame 1 kalimat","overlay":"teks layar maks 6 kata","aksi":"yang avatar lakukan","produk_tampil":true}]}. ' +
      "Jumlah shots HARUS sama dengan jumlah baris naskah, urut menyatu. Shot UGC realistis diambil HP.",
    `Produk: "${produk}"${niche ? ` · Niche: "${niche}"` : ""}\nAvatar: ${avatarPrompt || avatarSumber}\n\nNaskah per baris:\n${baris
      .map((b, i) => `${i + 1}. [${b.detik_mulai}-${b.detik_selesai}s] ${b.teks}`)
      .join("\n")}`,
    log
  );
  const papan = mk.extractJson<Papan>(raw3);
  const shots: Shot[] = (papan.shots || []).slice(0, baris.length).map((s) => ({
    peran: String(s.peran || "isi").slice(0, 20),
    shot: String(s.shot || "selfie medium").slice(0, 60),
    visual: String(s.visual || "").slice(0, 200),
    overlay: String(s.overlay || "").slice(0, 60),
    aksi: String(s.aksi || "").slice(0, 120),
    produk_tampil: !!s.produk_tampil,
  }));
  while (shots.length < baris.length) {
    shots.push({ peran: "isi", shot: "selfie medium", visual: "avatar membahas produk", overlay: "", aksi: "", produk_tampil: false });
  }
  log(`[board] ${shots.length} frame tersusun · gaya: ${(papan.gaya_visual || "-").slice(0, 80)}`);

  // ── 6. gambar AI per frame (mode "ai") — avatar jadi REFERENSI agar
  //      wajah/identitas konsisten di semua frame (z-ai image-edit) ────
  const frames: Array<{
    no: number; detikMulai: number; detikSelesai: number; peran: string;
    shot: string; visual: string; overlay: string; aksi: string; teksNaskah: string; img?: string;
  }> = [];
  const avatarAbs = avatarFile ? path.join(dir, avatarFile) : "";
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    const b = baris[i];
    let img: string | undefined;
    if (sbMode === "ai") {
      img = `frame-${String(i + 1).padStart(2, "0")}.png`;
      const prompt = avatarAbs
        ? `Ubah scene foto referensi ini: orang yang SAMA PERSIS (wajah, rambut, dan identitas tidak berubah), sekarang tampil dalam shot ${s.shot}. ${s.visual}. ` +
          `${s.produk_tampil ? `Produk "${produk}" terlihat jelas bersamanya.` : "Produk belum harus terlihat."} ` +
          `Pencahayaan alami rumahan, realistis kamera HP, TANPA teks atau tulisan di dalam gambar.`
        : `Frame storyboard video UGC vertikal 9:16 diambil kamera HP. ${papan.gaya_visual || "Gaya UGC realistis"}. ` +
          `Shot: ${s.shot}. ${s.visual}. ` +
          `${s.produk_tampil ? `Produk "${produk}" terlihat jelas di frame.` : "Produk belum harus terlihat."} ` +
          `Pencahayaan alami rumahan, realistis, TANPA teks atau tulisan di dalam gambar.`;
      const draw = async () =>
        avatarAbs
          ? mk.zaiImageEdit(prompt, avatarAbs, path.join(dir, img!), log, "768x1344")
          : mk.zaiImage(prompt, path.join(dir, img!), log, "768x1344");
      try {
        await draw();
        log(`[board] frame ${i + 1}/${shots.length} jadi (${img}${avatarAbs ? ", dari referensi avatar" : ""})`);
      } catch (e) {
        // sekali coba ulang, lalu biarkan frame tanpa gambar
        try {
          await draw();
          log(`[board] frame ${i + 1}/${shots.length} jadi (percobaan ke-2)`);
        } catch {
          img = undefined;
          log(`[board] frame ${i + 1} gagal digambar (${String((e as Error).message || e).slice(0, 60)}) — kartu teks saja`);
        }
      }
      if (img) {
        job.files!.push({ file: img, label: `Frame ${i + 1} — ${s.peran} (${s.shot})`, kind: "image" });
        await persist(job); // UI ikut update tiap frame jadi
      }
    }
    frames.push({
      no: i + 1,
      detikMulai: b.detik_mulai,
      detikSelesai: b.detik_selesai,
      peran: s.peran,
      shot: s.shot,
      visual: s.visual,
      overlay: s.overlay,
      aksi: s.aksi,
      teksNaskah: b.teks,
      img,
    });
  }

  // ── 7. storyboard.html — frame terhubung garis waktu ───────────────
  const sbHtml = buildStoryboardHtml({
    produk,
    durasiTotal: baris[baris.length - 1]?.detik_selesai || durasi,
    gayaVisual: papan.gaya_visual || "UGC realistis kamera HP",
    avatarFile,
    produkFile,
    avatarSumber,
    frames,
    refUrl: inputs.source || "",
  });
  await fs.writeFile(path.join(dir, "storyboard.html"), sbHtml, "utf8");
  job.files!.push({
    file: "storyboard.html",
    label: "Storyboard — frame terhubung garis waktu",
    kind: "doc",
  });
  log(`[board] storyboard.html siap (${frames.length} frame${sbMode === "ai" ? " + gambar AI" : ", mode teks"})`);
  await persist(job);

  // ── 8. voiceover TTS (naskah utuh) ─────────────────────────────────
  log("[tts] membuat voiceover…");
  const speech = path.join(dir, "ugc-voiceover.mp3");
  const teksVo = baris.map((b) => b.teks).join(" ");
  // edge-tts kadang flaky (NoAudioReceived sesekali) — 3 percobaan
  let voBytes = 0;
  for (let a = 1; a <= 3; a++) {
    try {
      await mk.ttsSynth(teksVo, voice, speech, "+0%", log);
      voBytes = (await fs.stat(speech)).size;
      break;
    } catch (e) {
      if (a === 3) throw e;
      log(`[tts] percobaan ${a} gagal (${((e as Error).message || "").slice(0, 80)}) → coba lagi…`);
      await new Promise((r) => setTimeout(r, 2000 * a));
    }
  }
  job.files!.push({ file: "ugc-voiceover.mp3", label: "Voiceover TTS (MP3)", kind: "audio" });

  // ── 9. caption SRT dari baris naskah ───────────────────────────────
  const srt = path.join(dir, "ugc-caption.srt");
  await fs.writeFile(
    srt,
    toSrt(baris.map((b) => ({ start: b.detik_mulai, end: b.detik_selesai, text: b.teks }))),
    "utf8"
  );
  job.files!.push({ file: "ugc-caption.srt", label: "Caption SRT (siap tempel editor)", kind: "subtitle" });

  // ── 10. RENDER VIDEO HASIL — frame storyboard × durasi beat (zoom pelan)
  //        + voiceover + caption dibakar → ugc-video.mp4 siap post di TikTok ──
  if (voBytes > 0) {
    log("[video] menyusun video draft dari storyboard…");
    try {
      // durasi voiceover → skala durasi tiap beat agar caption sinkron
      const pv = await execRun(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", speech]);
      const voDur = parseFloat(JSON.parse(pv.stdout).format?.duration || "0");
      const beatDurs = baris.map((b) => Math.max(1.5, b.detik_selesai - b.detik_mulai));
      const sumBeat = beatDurs.reduce((a, b) => a + b, 0);
      const factor = voDur > 1 ? voDur / sumBeat : 1;
      const segDurs = beatDurs.map((d) => +(d * factor).toFixed(2));

      // segmen per frame: gambar → klip 540x960 dengan zoom pelan (Ken Burns)
      const segFiles: string[] = [];
      for (let i = 0; i < frames.length; i++) {
        const imgAbs = frames[i].img
          ? path.join(dir, frames[i].img)
          : avatarAbs || "";
        const segOut = path.join(dir, `seg-${String(i + 1).padStart(2, "0")}.mp4`);
        const frames25 = Math.max(25, Math.round(segDurs[i] * 25));
        if (imgAbs) {
          const rr = await execRun([
            "ffmpeg", "-y", "-i", imgAbs,
            "-vf",
            "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920," +
              `zoompan=z='min(zoom+0.0009,1.14)':d=${frames25}:s=540x960:fps=25`,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-pix_fmt", "yuv420p", "-an", segOut,
          ]);
          if (rr.code !== 0) throw new Error(`segmen ${i + 1}: ` + tailErr(rr.stderr));
        } else {
          const rr = await execRun([
            "ffmpeg", "-y", "-f", "lavfi", "-i", `color=c=0x14120f:s=540x960:d=${segDurs[i]}`,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-an", segOut,
          ]);
          if (rr.code !== 0) throw new Error(`segmen ${i + 1} (fallback): ` + tailErr(rr.stderr));
        }
        segFiles.push(segOut);
        log(`[video] segmen ${i + 1}/${frames.length} (${segDurs[i]}s)`);
        await persist(job);
      }

      // concat segmen → base
      const listFile = path.join(dir, "concat.txt");
      await fs.writeFile(
        listFile,
        segFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"),
        "utf8"
      );
      const baseMp4 = path.join(dir, "ugc-base.mp4");
      const rc = await execRun(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", baseMp4]);
      if (rc.code !== 0) throw new Error("concat: " + tailErr(rc.stderr));

      // SRT khusus video (waktu hasil skala) lalu bakar + mux voiceover
      let acc = 0;
      const vidSrt = path.join(dir, "ugc-video.srt");
      await fs.writeFile(
        vidSrt,
        toSrt(frames.map((f, i) => {
          const start = acc;
          acc += segDurs[i];
          return { start, end: acc, text: f.teksNaskah };
        })),
        "utf8"
      );
      const videoOut = path.join(dir, "ugc-video.mp4");
      const vf = `subtitles=filename='${vidSrt}':fontsdir='${FONTS_DIR}'`;
      const fr = await execRun([
        "ffmpeg", "-y", "-i", baseMp4, "-i", speech,
        "-vf", vf,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
        "-shortest", "-movflags", "+faststart", videoOut,
      ]);
      if (fr.code !== 0) throw new Error("final: " + tailErr(fr.stderr));

      // bersihkan file perantara
      for (const f of [...segFiles, baseMp4, listFile]) await fs.rm(f, { force: true }).catch(() => {});

      // thumbnail + registrasi sebagai klip (muncul di pemutar video panel)
      await execRun(["ffmpeg", "-y", "-ss", "1", "-i", videoOut, "-frames:v", "1", "-vf", "scale=180:320", path.join(dir, "ugc-video.jpg")]);
      const vst = await fs.stat(videoOut);
      const vsec = Math.round(acc * 10) / 10;
      job.clips.push({
        file: "ugc-video.mp4",
        thumb: "ugc-video.jpg",
        start: 0,
        end: vsec,
        seconds: vsec,
        bytes: vst.size,
        title: `Video UGC — ${produk}`.slice(0, 60),
        lines: baris.length,
        preset: "ugc",
      });
      job.files!.push({ file: "ugc-video.srt", label: "SRT sinkron video (waktu hasil skala)", kind: "subtitle" });
      log(`[video] ugc-video.mp4 jadi (${(vst.size / 1e6).toFixed(2)} MB · ${vsec}s)`);
      await persist(job);
    } catch (e) {
      log(`[video] render video gagal (${String((e as Error).message || e).slice(0, 100)}) — paket lain tetap tersedia`);
      await persist(job);
    }
  }

  log(
    `✅ paket UGC siap — storyboard ${frames.length} frame + voiceover ${(voBytes / 1e6).toFixed(2)} MB + SRT ${baris.length} baris` +
      (avatarFile ? " + avatar" : "") + (produkFile ? " + foto produk" : "")
  );
}
