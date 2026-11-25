/** Tool "ragebait" (Rage Bait Studio) — short rage-bait ala kreator YouTube ID
 *  (formulanya di-reverse dari channel Issei Nugroho): hook provokatif + 3 momen
 *  bernomor + CTA, narasi gaya "gue/lu", ilustrasi komik AI, TTS +12% (pace khas
 *  shorts), karaoke merah, badge/chip overlay merah. Preset rage TERKUNCI — di UI
 *  muncul sebagai kartu terpisah, tapi di balik layar reuse mesin konten-tempel
 *  (TTS → whisper → gambar AI → render), tanpa duplikasi infrastruktur.
 *
 *  Pelajaran dari uji render E2E (jebakan prompt gambar AI):
 *  - JANGAN menyebut judul/narasi di prompt gambar → model menyalinnya jadi
 *    aksara (sering bleed teks Cina). Deskripsi adegan saja.
 *  - Hindari kata "kompilasi" → model bikin layout poster + banner headline.
 *    Pakai "adegan".
 *  - Variasikan framing (lebar/medium/close-up) → jangan semua close-up identik.
 *  - Naskah harus "nyebelin" — DILARANG gross (buang air, dll) & SARA.
 *
 *  Arsitektur render (mesin ffmpeg, bukan Remotion):
 *  TTS per-scene (5 audio) → concat → whisper word-level → durasi tiap scene
 *  diketahui persis dari file audionya (bukan tebakan) → render tiap scene
 *  (loop gambar + zoom lembut + overlay drawtext + ASS karaoke merah) → concat
 *  demuxer stream-copy → rage-bait.mp4. */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "../mediakit";
import { run as runCmd, tailErr } from "../exec";
import { buildAss, type Word } from "../captions";
import { thumb, type ToolCtx } from "./_shared";

const RATE = "+12%";
const RED = "0xFF3B30"; // accent rage (ffmpeg color: 0xRRGGBB)
const ANTON = () => path.join(mk.FONTS_DIR, "Anton-Regular.ttf");
const DEJAVU_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

type Scene = {
  title: string; // overlay besar (UPPERCASE, pendek)
  text: string; // narasi dibacakan TTS
  scene: string; // deskripsi visual untuk prompt gambar
};

type RageScript = {
  hook: Scene;
  moments: Scene[]; // tepat 3
  cta: Scene;
};

/** Buang karakter yang merusak filter drawtext: quote, titik dua, backslash,
 *  % (expansion drawtext), backtick & $ (expansion shell/drawtext). */
const drawSafe = (s: string) => s.replace(/['":\\%`$]/g, "").trim();

const SYSTEM_PROMPT = `Kamu penulis naskah short video "rage bait" ala kreator YouTube Indonesia
(gaya kreator seperti Issei Nugroho): topik sehari-hari yang bikin DARAH NAIK, bahasa gaul
"gue/lu", tempo cepat, provokatif tapi TIDAK vulgar dan TIDAK gross (DILARANG: buang air,
kencing, SARA, kekerasan grafis, ujaran kebencian). Respons WAJIB JSON valid TANPA markdown,
skema:
{
  "hook":   { "title": "JUDUL HOOK UPPERCASE MAKS 26 HURUF, bikin darah naik",
              "text": "kalimat pembuka 8-14 kata gaya gue/lu",
              "scene": "deskripsi adegan visual untuk ilustrasi komik, bahasa Indonesia, tanpa teks" },
  "moments": [
    { "title": "JUDUL MOMEN UPPERCASE MAKS 24 HURUF", "text": "narasi 28-35 kata yang menceritakan kejadian nyebelin secara spesifik dan detail", "scene": "deskripsi visual MURNI (pose, ekspresi, suasana, setting) — DILARANG menyebut dialog, kata-kata, tulisan, atau apa pun yang akan ditulis di gambar" },
    (tepat 3 momen, kejadian makin mengerikan/makin nyebelin)
  ],
  "cta":    { "text": "1 kalimat ajakan like/follow maks 12 kata gaya gue/lu",
              "scene": "deskripsi adegan visual penonton bersemangat" }
}
Aturan WAJIB: hook.text = 12-16 kata, SETIAP moments.text = 28-35 kata, cta.text = 10-14 kata.
Total (hook.text + semua moments.text + cta.text) = 100-115 kata — jangan di bawah itu.
Kejadian harus masuk akal dan spesifik (angkot, parkir liar, antre, tetangga, netizen, ojol, dll
sesuai topik). Jangan menyebut merek orang nyata secara merendahkan.`;

/** LLM → skrip rage terstruktur. Gagal parse → error jelas.
 *  LLM cenderung undershoot target kata (uji: minta 100-115 → cuma 59) —
 *  kalau naskah kurang padat (<80 kata), minta ulang 1x dengan teguran. */
async function genScript(topik: string, log: (l: string) => void): Promise<RageScript> {
  let extra = "";
  let last: RageScript | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await mk.zaiChat(SYSTEM_PROMPT + extra, `Topik: ${topik}`, log);
    let j: RageScript;
    try {
      j = mk.extractJson<RageScript>(raw);
    } catch {
      throw new Error("LLM tidak mengembalikan JSON yang valid — coba topik lain");
    }
    const moments = Array.isArray(j.moments) ? j.moments.slice(0, 3) : [];
    const ok =
      j.hook?.title && j.hook?.text && moments.length === 3 &&
      moments.every((m) => m?.title && m?.text) && j.cta?.text;
    if (!ok) throw new Error("struktur naskah rage tidak lengkap dari LLM — coba lagi");
    last = j;
    const words = [j.hook.text, ...moments.map((m) => m.text), j.cta.text]
      .join(" ").split(/\s+/).length;
    if (words >= 90) return j;
    log(`[naskah] kurang padat (${words} kata < 90) → minta LLM menulis ulang lebih panjang…`);
    extra =
      "\n\nTEGURAN: naskah kamu sebelumnya cuma " + words +
      " kata — TERLALU PENDEK. Tulis ulang: hook.text 12-16 kata, SETIAP moments.text " +
      "28-35 kata dengan detail kejadian yang spesifik, cta.text 10-14 kata. Total minimal 100 kata.";
  }
  return last as RageScript;
}

/** Prompt gambar komik per scene — mengikuti pelajaran anti-bleed di header. */
function imagePrompt(s: Scene, kind: string, framing: string, topik: string): string {
  return (
    `Ilustrasi komik kartun vertikal 9:16, gaya webtoon Indonesia dengan garis tebal, ` +
    `warna saturasi tinggi, ekspresi wajah over-the-top. ${framing} menggambarkan: ${s.scene}. ` +
    `Konteks topik video: ${topik}. Adegan ${kind}. ` +
    `PENTING: ini BUKAN poster dan BUKAN halaman komik bergaya panel — tanpa speech bubble, ` +
    `tanpa balon kata, tanpa teks apa pun, tanpa huruf, tanpa angka, tanpa aksara bahasa apa pun ` +
    `(Latin, Cina, Jepang, Arab), tanpa banner, tanpa judul, tanpa logo; hanya karakter dan adegan.`
  );
}

/** Pecah judul jadi maks 2 baris untuk drawtext (Anton lebar). */
function twoLines(t: string): [string, string | null] {
  const w = t.split(/\s+/);
  if (t.length <= 14 || w.length === 1) return [t, null];
  let a: string[] = [], b: string[] = [];
  for (const x of w) (a.join(" ").length + x.length <= 14 && !b.length ? a : b).push(x);
  if (!b.length && a.length > 1) b = [a.pop() as string];
  return [a.join(" "), b.join(" ") || null];
}

/** Overlay drawtext per scene, dikomposisikan setelah zoompan. */
function overlays(i: number, total: number, sc: Scene, isHook: boolean, isCta: boolean): string {
  const f = (extra: string) => extra.replace(/'/g, ""); // teks sudah drawSafe
  const dt = (o: Record<string, string | number>) => {
    const map: string[] = [];
    for (const [k, v] of Object.entries(o)) map.push(`${k}=${typeof v === "number" ? v : `'${f(String(v))}'`}`);
    return `drawtext=${map.join(":")}`;
  };
  const title = (t: string, y: number, size: number) =>
    dt({ fontfile: ANTON(), text: drawSafe(t), fontsize: size, fontcolor: "white",
      borderw: 3, bordercolor: "black", x: "(w-text_w)/2", y });
  if (isHook) {
    const [l1, l2] = twoLines(sc.title);
    const badge = dt({ fontfile: DEJAVU_B, text: "GAK MASUK AKAL", fontsize: 30, fontcolor: "white",
      box: 1, boxcolor: `${RED}@0.92`, boxborderw: 14, x: "(w-text_w)/2", y: 42 });
    const t1 = title(l1, 102, 50);
    return badge + "," + t1 + (l2 ? "," + title(l2, 168, 50) : "");
  }
  if (isCta) {
    const big = dt({ fontfile: ANTON(), text: "LIKE SEKARANG", fontsize: 56, fontcolor: RED,
      borderw: 3, bordercolor: "black", x: "(w-text_w)/2", y: 108 });
    const sub = dt({ fontfile: DEJAVU_B, text: drawSafe(sc.title || "FOLLOW BIAR GAK KETINGGALAN"),
      fontsize: 26, fontcolor: "white", box: 1, boxcolor: "black@0.55", boxborderw: 10,
      x: "(w-text_w)/2", y: 196 });
    return big + "," + sub;
  }
  const [l1, l2] = twoLines(sc.title);
  const chip = dt({ fontfile: DEJAVU_B, text: `MOMEN ${i}/${total}`, fontsize: 28, fontcolor: "white",
    box: 1, boxcolor: `${RED}@0.92`, boxborderw: 12, x: 24, y: 42 });
  const t1 = title(l1, 100, 44);
  return chip + "," + t1 + (l2 ? "," + title(l2, 162, 44) : "");
}

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const topik = (inputs.topik || "").trim();
  if (!topik) throw new Error("isi topik rage dulu (mis. 'penumpang angkot gila hape')");
  const voice = inputs.voice || "id-ID-ArdiNeural";

  // 1) Naskah LLM: hook + 3 momen + cta
  const script = await genScript(topik, log);
  const scenes: Array<{ sc: Scene; isHook: boolean; isCta: boolean }> = [
    { sc: script.hook, isHook: true, isCta: false },
    ...script.moments.map((m) => ({ sc: m, isHook: false, isCta: false })),
    { sc: script.cta, isHook: false, isCta: true },
  ];
  const naskahFull = scenes.map((s) => s.sc.text).join("\n\n");
  const nWords = naskahFull.split(/\s+/).length;
  job.texts!.push({ label: "Naskah Rage Bait", body: naskahFull });
  log(`[naskah] hook="${script.hook.title}" · ${nWords} kata`);
  if (nWords < 60) log("[naskah] warning: naskah agak pendek dari target 100-115 kata");

  // 2) TTS per scene (+12% pace shorts) → durasi scene persis dari file audionya
  const audios: string[] = [];
  const durs: number[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const a = path.join(dir, `speech-${i}.mp3`);
    await mk.ttsSynth(scenes[i].sc.text, voice, a, RATE, log);
    audios.push(a);
    durs.push(await mk.probeDur(a));
    log(`[tts] scene ${i + 1}/${scenes.length} = ${durs[i].toFixed(2)}s`);
  }
  const starts: number[] = [];
  let acc = 0;
  for (const d of durs) { starts.push(acc); acc += d; }
  const totalDur = acc;

  // 3) Concat audio → whisper word-level (timeline kontinu)
  const listFile = path.join(dir, "audio-list.txt");
  await fs.writeFile(listFile, audios.map((a) => `file '${a}'`).join("\n"));
  const speechAll = path.join(dir, "speech-all.mp3");
  const cat = await runCmd(["ffmpeg", "-y", "-hide_banner", "-f", "concat", "-safe", "0",
    "-i", listFile, "-c", "copy", speechAll]);
  if (cat.code !== 0) throw new Error("concat audio gagal: " + tailErr(cat.stderr));
  const wav = await mk.extractAudio(speechAll, dir);
  const info = await mk.transcribe(wav, dir, log);
  const words: Word[] = info.segments.flatMap((s) => s.words || []);

  // 4) Gambar komik AI per scene (framing dirotasi biar gak monoton)
  const framings = [
    "adegan lebar dari sisi depan",
    "adegan medium sekitar karakter",
    "close-up wajah karakter utama",
    "adegan dari sudut samping",
    "adegan lebar dengan karakter di tengah",
  ];
  const kinds = ["pembuka yang menggambarkan situasi awal", "intensitas mulai naik",
    "puncak kekesalan", "kejadian paling nyebelin", "penutup semangat"];
  const images: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const img = path.join(dir, `img-${i}.png`);
    await mk.zaiImage(imagePrompt(scenes[i].sc, kinds[i], framings[i], topik), img, log);
    images.push(img);
  }

  // 5) Render per scene: zoom lembut + overlay + karaoke merah ("karaoke-classic" = #FF3B30)
  const segs: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const d = durs[i];
    const assPath = path.join(dir, `rage-${i}.ass`);
    const wIn = words.filter((w) => w.start >= starts[i] - 0.02 && w.start < starts[i] + d);
    await fs.writeFile(assPath, buildAss(wIn, {
      presetId: "karaoke-classic", clipStart: starts[i], clipEnd: starts[i] + d,
    }));
    const seg = path.join(dir, `seg-${i}.mp4`);
    const fade = i === scenes.length - 1
      ? `,afade=t=out:st=${Math.max(d - 0.35, 0).toFixed(2)}:d=0.35` : "";
    const vf =
      `scale=1080:1920,zoompan=z='min(1+0.0011*in,1.12)':d=1:x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2'` +
      `:fps=30:s=540x960,` +
      overlays(i, scenes.length - 2, scenes[i].sc, scenes[i].isHook, scenes[i].isCta) +
      `,subtitles=filename='${assPath}':fontsdir='${mk.FONTS_DIR}'`;
    try {
      const r = await runCmd(["ffmpeg", "-y", "-hide_banner", "-loop", "1", "-i", images[i],
        "-i", audios[i], "-t", d.toFixed(2), "-vf", vf, "-af", "afade=t=in:d=0.12" + fade,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-r", "30",
        "-c:a", "aac", "-b:a", "160k", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", seg]);
      if (r.code !== 0) throw new Error(`render scene ${i + 1} gagal: ` + tailErr(r.stderr));
    } finally {
      await fs.rm(assPath, { force: true });
    }
    segs.push(seg);
    log(`[render] scene ${i + 1}/${scenes.length} jadi (${d.toFixed(1)}s)`);
  }

  // 6) Concat stream-copy → final
  const segList = path.join(dir, "seg-list.txt");
  await fs.writeFile(segList, segs.map((s) => `file '${s}'`).join("\n"));
  const out = path.join(dir, "rage-bait.mp4");
  const fin = await runCmd(["ffmpeg", "-y", "-hide_banner", "-f", "concat", "-safe", "0",
    "-i", segList, "-c", "copy", "-movflags", "+faststart", out]);
  if (fin.code !== 0) throw new Error("concat final gagal: " + tailErr(fin.stderr));

  const st = await fs.stat(out);
  await thumb(dir, out, "th-ragebait.jpg");
  job.clips.push({
    file: "rage-bait.mp4", thumb: "th-ragebait.jpg", start: 0,
    end: Math.round(totalDur * 10) / 10, seconds: Math.round(totalDur * 10) / 10,
    bytes: st.size, title: drawSafe(script.hook.title) || "Rage Bait",
    lines: words.length, preset: "rage-locked",
  });
  job.title = "Rage Bait Studio";
  log(`[ragebait] jadi ${Math.round(totalDur)}s (${(st.size / 1e6).toFixed(2)} MB)`);
}
