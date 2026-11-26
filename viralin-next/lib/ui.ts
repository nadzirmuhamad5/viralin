/**
 * Konstanta & helper UI client-safe — dipakai bersama oleh app/page.tsx,
 * components/JobPanel.tsx, dst. supaya format teks ikon/waktu/ukuran tidak
 * pernah berbeda antar halaman.
 *
 * Import `Job` di sini type-only: aman di client walaupun lib/store.ts
 * meng-import node fs (type-nya hilang saat compile).
 */
import type { Job } from "@/lib/store";

/** Alias tipe job untuk komponen client — re-export type-only (nol runtime cost). */
export type JobView = Job;

/**
 * Ikon status — definisi yang sama persis dengan yang tadinya diduplikasi di
 * page.tsx & JobPanel.tsx. Key mengikuti StageStatus ("pending"); Job.status
 * "queued" tidak ada di map, pemanggil (riwayat job di page.tsx) memakai
 * fallback "⚙️" seperti sebelumnya supaya teks UI tidak berubah.
 */
export const ICO: Record<string, string> = { pending: "⏳", run: "⚙️", done: "✅", fail: "❌" };

/** Detik → "m:ss", atau "—" bila null/undefined. Format sama persis kode lama. */
export const fmt = (s?: number) =>
  s == null ? "—" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** Bytes → "x.xx MB". */
export const MB = (b: number) => (b / 1e6).toFixed(2) + " MB";
