/** Antrian tugas sederhana (semaphore async) — batasi job pipeline yang jalan
 *  paralel agar CPU/RAM sandbox tidak jebol saat banyak request masuk. */
const MAX = Number(process.env.VL_MAX_CONCURRENT || 2);
const MAX_WAITING = Number(process.env.VL_MAX_WAITING || 12);

let active = 0;
const waiting: Array<() => void> = [];

/**
 * Jalankan fn saat slot aktif tersedia; kalau penuh, antre FIFO dan semua
 * tugas dilanjutkan berurutan sesuai urutan masuk.
 */
export async function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX) {
    // tunggu giliran — slot dilepas oleh tugas yang selesai (FIFO)
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    const next = waiting.shift();
    if (next) next(); // beri giliran ke tugas berikutnya dalam antrean
  }
}

/** Statistik antrian — dipakai route untuk keputusan backpressure (429). */
export function queueStats(): { active: number; waiting: number; max: number; maxWaiting: number } {
  return { active, waiting: waiting.length, max: MAX, maxWaiting: MAX_WAITING };
}
