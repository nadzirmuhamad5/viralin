/** Penjadwal berita harian → bikin job motion-studio mode "berita".
 *  Dipanggil instrumentation.ts (boot + interval 20 mnt). */
import { createJob, runJob } from "./pipeline";
import { allJobs, persist } from "./store";
import { DEFAULT_PRESET } from "./captions";
import { newsHeadlines, pickFreshItem, isDue, loadState, saveState, topicForDay, todayJakarta } from "./berita";

export async function beritaTick(opts?: { force?: boolean; topik?: string }): Promise<{ ran: boolean; jobId?: string; reason?: string }> {
  if (process.env.BERITA_ENABLED === "0" && !opts?.force) return { ran: false, reason: "BERITA_ENABLED=0" };
  const state = await loadState();
  if (!opts?.force && !isDue(state)) {
    // hari ini sudah ditandai jalan — kecuali SEMUA job berita hari ini gagal
    // (mis. render dimatikan recycle) → beri kesempatan ulang.
    const start = Date.parse(`${todayJakarta()}T00:00:00+07:00`);
    const todays = (await allJobs()).filter((j) =>
      j.tool === "motion-studio" && j.inputs?.mode === "berita" && (j.createdAt || 0) >= start);
    const anyDone = todays.some((j) => j.status === "done");
    const allFail = todays.length > 0 && todays.every((j) => j.status === "fail");
    if (!allFail || anyDone) return { ran: false, reason: "belum jatuh tempo (target 07:00 WIB / sudah jalan hari ini)" };
    console.log("[berita] semua job berita hari ini gagal → ulangi otomatis");
  }
  const topik = (opts?.topik || topicForDay()).trim();
  const items = await newsHeadlines(topik);
  if (!items.length) return { ran: false, reason: "RSS tanpa item" };
  const item = await pickFreshItem(items);
  const job = createJob("", DEFAULT_PRESET, "motion-studio", {
    mode: "berita",
    topik,
    // headline/sumber diconsumsi toolrun mode berita (scheduler bypass route, jadi lolos)
    headline: item.title.slice(0, 400),
    sumber: item.source.slice(0, 80),
  });
  await persist(job);
  // tandai hari berjalan SEKARANG — tick berikut tidak dobel (job gagal tetap terekam di UI)
  const state2 = await loadState();
  state2.lastRunDate = todayJakarta();
  await saveState(state2);
  void runJob(job).catch(() => {}); // pipeline menandai fail sendiri di job
  return { ran: true, jobId: job.id };
}
