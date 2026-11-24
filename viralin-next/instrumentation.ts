/** Next instrumentation — jalan sekali per server start (Node runtime).
 *  Penjadwal berita harian: cek saat boot (catch-up setelah recycle) + tiap 20 menit.
 *  Target 07:00 WIB (BERITA_HOUR), rotasi topik per hari; matikan dgn BERITA_ENABLED=0. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { beritaTick } = await import("./lib/scheduler");
  const { BERITA_HOUR, topicForDay } = await import("./lib/berita");
  console.log(`[berita] scheduler aktif — target ${BERITA_HOUR}:00 WIB, topik hari ini: "${topicForDay()}", topik tersedia: ${process.env.BERITA_TOPICS || "default"}`);
  const tick = async (why: string) => {
    try {
      const r = await beritaTick();
      if (r.ran) console.log(`[berita] job harian dibuat (${why}): ${r.jobId}`);
    } catch (e) {
      console.error(`[berita] tick gagal (${why}):`, (e as Error)?.message || e);
    }
  };
  void tick("boot");
  setInterval(() => void tick("interval"), 20 * 60_000).unref();
}
