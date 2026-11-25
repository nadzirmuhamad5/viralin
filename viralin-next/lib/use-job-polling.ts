"use client";

/**
 * Hook polling untuk SATU job aktif — menggantikan logika `watch()` +
 * setInterval yang tadinya diduplikasi di app/page.tsx & components/ToolRunner.tsx.
 *
 * Perilaku:
 * - Poll GET /api/jobs/<id> tiap `intervalMs` (default 1500). Fetch pertama langsung.
 * - Backoff eksponensial saat fetch gagal: interval menggandakan diri hingga
 *   maks 8s, reset ke interval dasar saat sukses. Network error mengisi state
 *   `error` tapi polling tetap jalan.
 * - Pause saat `document.hidden` (listener visibilitychange), resume saat visible.
 * - AbortController di-abort saat unmount / id berganti (tidak ada setState
 *   setelah unmount).
 * - Saat status jadi "done"/"fail": berhenti poll, panggil onDone/onFail tepat
 *   sekali, job terakhir tetap disimpan di state.
 * - Penanganan respons toleran: API mengembalikan objek job langsung;
 *   `inputs` (mis. cookies) bisa di-redact/hilang — jangan pernah mengandalkannya.
 */
import { useEffect, useRef, useState } from "react";
import type { Job } from "@/lib/store";

export type UseJobPollingOptions = {
  /** Dipanggil tepat sekali saat job berstatus "done". */
  onDone?: (job: Job) => void;
  /** Dipanggil tepat sekali saat job berstatus "fail". */
  onFail?: (job: Job) => void;
  /** Jeda antar poll dalam ms (default 1500). */
  intervalMs?: number;
};

export type UseJobPollingResult = {
  job: Job | null;
  error: string | null;
};

const DEFAULT_INTERVAL_MS = 1500;
const MAX_BACKOFF_MS = 8000;

export function useJobPolling(
  id: string | null,
  opts?: UseJobPollingOptions
): UseJobPollingResult {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selalu baca callback terbaru lewat ref tanpa menjadikannya dependency effect,
  // supaya polling tidak restart hanya karena konsumen me-render ulang.
  const cbRef = useRef<UseJobPollingOptions | undefined>(opts);
  useEffect(() => {
    cbRef.current = opts;
  });

  const intervalMs = opts?.intervalMs ?? DEFAULT_INTERVAL_MS;

  useEffect(() => {
    // Target watch berganti → buang job/error lama agar konsumen tidak menampilkan
    // data job sebelumnya. (Job dari respons POST / klik riwayat tetap dipegang
    // konsumen, jadi panel tidak berkedip sebelum poll pertama masuk.)
    setJob(null);
    setError(null);
    if (!id) return;

    let alive = true;
    let finished = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let delay = intervalMs;
    const ctl = new AbortController();

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const schedule = (ms: number) => {
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        void tick();
      }, ms);
    };

    const finish = (j: Job) => {
      finished = true;
      clearTimer();
      setJob(j);
      if (j.status === "done") cbRef.current?.onDone?.(j);
      else cbRef.current?.onFail?.(j);
    };

    const tick = async (): Promise<void> => {
      if (!alive || finished || inFlight || ctl.signal.aborted) return;
      if (document.hidden) return; // pause saat tab tidak terlihat
      inFlight = true;
      let ok = false;
      try {
        const r = await fetch(`/api/jobs/${id}`, { cache: "no-store", signal: ctl.signal });
        if (!alive || ctl.signal.aborted) return;
        if (r.ok) {
          // Toleran: job dikembalikan langsung; bentuk tak dikenal diabaikan
          // dan siklus berikutnya tetap berjalan.
          const data: unknown = await r.json();
          if (!alive || ctl.signal.aborted) return;
          const j = data as Partial<Job> | null | undefined;
          if (j && typeof j === "object" && typeof j.id === "string" && typeof j.status === "string") {
            ok = true;
            setError(null);
            if (j.status === "done" || j.status === "fail") finish(j as Job);
            else setJob(j as Job);
          }
        }
      } catch (e) {
        if (!alive || ctl.signal.aborted) return; // unmount / id berganti — abaikan
        if (!finished) setError(e instanceof Error ? e.message : String(e));
      } finally {
        inFlight = false;
      }
      if (!alive || finished || ctl.signal.aborted) return;
      // Backoff eksponensial saat siklus gagal, reset ke interval dasar saat sukses.
      delay = ok ? intervalMs : Math.min(delay * 2, MAX_BACKOFF_MS);
      schedule(delay);
    };

    const onVisibility = () => {
      if (!alive || finished) return;
      if (document.hidden) {
        clearTimer(); // pause
      } else {
        void tick(); // resume langsung
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    void tick(); // fetch pertama langsung (tanpa menunggu interval)

    return () => {
      alive = false;
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibility);
      ctl.abort();
    };
  }, [id, intervalMs]);

  return { job, error };
}
