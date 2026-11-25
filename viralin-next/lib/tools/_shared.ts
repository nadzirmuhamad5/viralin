/** Tipe & helper bersama untuk semua modul tool di lib/tools/.
 *  Dipindahkan 1:1 dari toolrun.ts monolitik agar perilaku tetap identik.
 *
 *  Catatan tipe: `Job.files` / `Job.texts` opsional di deklarasi tipe, tetapi
 *  pipeline selalu menginisialisasinya jadi `[]` untuk 16 tool yang lewat
 *  runTool (lihat pipeline.ts). Modul tool memakai `job.files!` / `job.texts!`
 *  di titik push — runtime identik dengan kode lama, kompiler senang. */
import path from "path";
import { run } from "../exec";
import type { Job } from "../store";

export type Log = (l: string) => void;

/** Konteks eksekusi tool: job aktif, dir kerja, input user, sink log. */
export type ToolCtx = {
  job: Job;
  dir: string;
  inputs: Record<string, string>;
  log: Log;
};

/** Parse angka dari input string, fallback default, dijepit ke [min,max]. */
export const num = (v: string | undefined, d: number, min = 0, max = 3600): number => {
  const n = parseFloat(v || "");
  return isNaN(n) ? d : Math.min(max, Math.max(min, n));
};

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** Frame thumbnail 180×320 di detik ke-1 (kegagalan diabaikan, tanpa throw). */
export async function thumb(dir: string, video: string, name: string): Promise<void> {
  await run(["ffmpeg", "-y", "-hide_banner", "-ss", "1", "-i", video,
    "-frames:v", "1", "-vf", "scale=180:320", path.join(dir, name)]);
}

export function pad(n: number, w = 2): string {
  return String(Math.floor(n)).padStart(w, "0");
}

export function tsSrt(t: number): string {
  const ms = Math.round((t % 1) * 1000);
  return `${pad(t / 3600)}:${pad((t / 60) % 60)}:${pad(t % 60)},${pad(ms, 3)}`;
}

export function tsVtt(t: number): string {
  const ms = Math.round((t % 1) * 1000);
  return `${pad(t / 3600)}:${pad((t / 60) % 60)}:${pad(t % 60)}.${pad(ms, 3)}`;
}

export function toSrt(segs: Array<{ start: number; end: number; text: string }>): string {
  return segs.map((s, i) => `${i + 1}\n${tsSrt(s.start)} --> ${tsSrt(s.end)}\n${s.text}`).join("\n\n");
}

export function toVtt(segs: Array<{ start: number; end: number; text: string }>): string {
  return "WEBVTT\n\n" + segs.map((s) => `${tsVtt(s.start)} --> ${tsVtt(s.end)}\n${s.text}`).join("\n\n");
}
