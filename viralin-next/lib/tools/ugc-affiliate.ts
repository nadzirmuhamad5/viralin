/** Tool "ugc-affiliate" — TIRU KONTEN viral → paket UGC produk affiliate TikTok.
 *  Alur: unduh video referensi → transkrip whisper → LLM bedah struktur
 *  (hook / beat / CTA / kenapa viral) → LLM tulis naskah UGC BARU dengan struktur
 *  yang ditiru untuk produk affiliate user → voiceover TTS + caption SRT + tips
 *  posting. Semua stack gratis: yt-dlp · faster-whisper · edge-tts · z-ai LLM.
 *
 *  Catatan etik: meniru STRUKTUR/format video (hook-beat-CTA) — bukan menyalin
 *  kata-kata penulis asli. Naskah selalu ditulis baru untuk produk user. */
import path from "path";
import { promises as fs } from "fs";
import * as mk from "../mediakit";
import { run as execRun, tailErr } from "../exec";
import { num, toSrt, type ToolCtx } from "./_shared";

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

const VOICES = ["id-ID-ArdiNeural", "id-ID-GadisNeural", "en-US-AndrewMultilingualNeural", "en-US-AvaMultilingualNeural"];

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const produk = (inputs.produk || "").trim();
  if (!produk) throw new Error("Nama produk wajib diisi");
  const cta = (inputs.cta || "Cek keranjang kuning sekarang sebelum promo habis!").trim();
  const niche = (inputs.niche || "").trim();
  const durasi = num(inputs.durasi, 30, 10, 90);
  const voice = VOICES.includes(inputs.voice || "") ? inputs.voice! : VOICES[0];

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

  // ── 5. voiceover TTS (naskah utuh) ─────────────────────────────────
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

  // ── 6. caption SRT dari baris naskah ───────────────────────────────
  const srt = path.join(dir, "ugc-caption.srt");
  await fs.writeFile(
    srt,
    toSrt(baris.map((b) => ({ start: b.detik_mulai, end: b.detik_selesai, text: b.teks }))),
    "utf8"
  );
  job.files!.push({ file: "ugc-caption.srt", label: "Caption SRT (siap tempel editor)", kind: "subtitle" });

  log(`✅ paket UGC siap — voiceover ${(voBytes / 1e6).toFixed(2)} MB + SRT ${baris.length} baris`);
}
