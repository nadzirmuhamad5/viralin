/** Tool "brand-kit" — bakar logo/watermark (posisi, ukuran, opasitas).
 *  Perbaikan (D): SSRF hardening URL logo — hanya http(s) publik, cek host
 *  internal/privat sebelum curl, batas ukuran 20MB, verifikasi magic bytes. */
import { promises as fs } from "fs";
import path from "path";
import * as mk from "../mediakit";
import { run as runCmd, tailErr } from "../exec";
import { clamp, num, type ToolCtx } from "./_shared";

/** Host yang dianggap internal/privat (SSRF) — hostname sudah lowercase & tanpa bracket/port. */
function isBlockedHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".local")) return true;
  if (host === "0.0.0.0" || /^127\./.test(host)) return true; // loopback IPv4
  if (/^10\./.test(host)) return true; // kelas A privat
  if (/^192\.168\./.test(host)) return true; // kelas C privat
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true; // kelas B privat 172.16–31
  if (/^169\.254\./.test(host)) return true; // link-local (termasuk metadata cloud)
  if (host === "::1" || host === "::") return true; // loopback / unspecified IPv6
  return false;
}

/** Validasi URL logo: harus http(s) publik. Lempar error sebelum curl dijalankan. */
function validateLogoUrl(raw: string | undefined): URL {
  if (!raw || !/^https?:\/\//i.test(raw)) {
    throw new Error("logo harus URL http(s) yang valid");
  }
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("logo harus URL http(s) yang valid");
  }
  // hostname lowercase, buang bracket IPv6 (port memang tidak ikut di hostname)
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || isBlockedHost(host)) {
    throw new Error("logo diblokir: host internal/privat tidak diizinkan (SSRF)");
  }
  return u;
}

/** Verifikasi magic bytes: PNG / JPEG / GIF / WebP. */
async function isImageFile(p: string): Promise<boolean> {
  const fh = await fs.open(p, "r");
  try {
    const buf = Buffer.alloc(12);
    const { bytesRead } = await fh.read(buf, 0, 12, 0);
    const b = buf.subarray(0, bytesRead);
    const ascii = (from: number, to: number) => b.subarray(from, to).toString("latin1");
    if (b.length >= 8 && b[0] === 0x89 && ascii(1, 4) === "PNG") return true;
    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
    if (b.length >= 6 && ascii(0, 3) === "GIF") return true; // GIF87a / GIF89a
    if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return true;
    return false;
  } finally {
    await fh.close();
  }
}

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const { src } = await mk.getSource(inputs.source, dir, log, inputs.cookies);
  // SSRF hardening: validasi URL logo SEBELUM curl dijalankan
  validateLogoUrl(inputs.logo);
  const logoPath = path.join(dir, "logo.png");
  const lr = await runCmd(["curl", "-sL", "--max-time", "30", "--max-filesize", "20m",
    "-o", logoPath, inputs.logo]);
  if (lr.code !== 0 || !(await fs.stat(logoPath).then(() => true).catch(() => false))) {
    throw new Error("logo gagal diunduh");
  }
  // bukan gambar valid (PNG/JPEG/GIF/WebP) → jangan diteruskan ke ffmpeg
  if (!(await isImageFile(logoPath))) throw new Error("logo bukan gambar yang valid");
  const op = clamp(num(inputs.opacity, 80, 10, 100), 10, 100) / 100;
  const sc = clamp(num(inputs.scale, 18, 5, 50), 5, 50) / 100;
  const logoW = Math.max(40, Math.round(540 * sc)); // % dari lebar output 540
  const pos: Record<string, string> = {
    tl: "30:30", tr: `main_w-overlay_w-30:30`,
    bl: "30:main_h-overlay_h-30", br: `main_w-overlay_w-30:main_h-overlay_h-30`,
  };
  const [px, py] = (pos[inputs.position || "tr"] || pos.tr).split(":");
  const out = path.join(dir, "branded.mp4");
  const r = await runCmd(["ffmpeg", "-y", "-hide_banner", "-i", src, "-i", logoPath, "-t", "120",
    "-filter_complex",
    `[1]scale=${logoW}:-1,format=rgba,colorchannelmixer=aa=${op}[lg];` +
    `[0][lg]overlay=x=${px}:y=${py}[v]`,
    "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
    "-c:a", "copy", "-t", "120", out]);
  if (r.code !== 0) throw new Error("watermark gagal: " + tailErr(r.stderr));
  job.files!.push({ file: "branded.mp4", label: "Video + watermark logo", kind: "video" });
  job.title = "Brand Kit — Watermark";
  log("[brand] watermark terpasang");
}
