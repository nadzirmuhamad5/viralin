/** Job store: state in-memory + persist JSON ke data/jobs/ (bertahan antar restart). */
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import path from "path";

export const DATA = path.join(process.cwd(), "data");
const JOBS_DIR = path.join(DATA, "jobs");
const UPLOADS_DIR = path.join(DATA, "uploads");

/** Waktu boot proses OS — ambang penandaan job stale (lihat loadAll).
 *  process.uptime() identik di semua instansi modul (satu proses dev),
 *  berbeda dari konstanta module-level yang ter-instantiasi ulang saat HMR. */
const PROC_BOOT_MS = Date.now() - Math.round(process.uptime() * 1000);

export type StageStatus = "pending" | "run" | "done" | "fail";
export type Stage = { name: string; label: string; status: StageStatus; ms?: number; since?: number };

export type Clip = {
  file: string;
  thumb: string;
  start: number;
  end: number;
  seconds: number;
  bytes: number;
  title: string;
  lines: number;
  preset?: string;
};

export type JobFile = { file: string; label: string; kind: "video" | "image" | "subtitle" | "audio"; link?: string };
export type JobText = { label: string; body: string };

export type Job = {
  id: string;
  url: string;
  title: string;
  status: "queued" | "run" | "done" | "fail";
  createdAt: number;
  captionPreset: string;
  tool?: string;
  inputs?: Record<string, string>;
  files?: JobFile[];
  texts?: JobText[];
  stages: Stage[];
  logs: string[];
  clips: Clip[];
  error?: string;
  sourceSeconds?: number;
  lang?: string;
};

/** Registry job aktif — diisi ulang dari disk saat proses baru bangun. */
export const jobs: Map<string, Job> = new Map();
/** mtime json yang terakhir dilihat instance ini — disk jadi sumber kebenaran bacaan.
 *  (Di dev Turbopack tiap bundle route bisa punya salinan module store sendiri;
 *  sinkron via disk mtime membuat semua instance selalu melihat state terbaru.) */
const diskMtime = new Map<string, number>();
let loaded = false;
// single-flight: semua caller menunggu promise load yang sama (anti race antar request)
let loadPromise: Promise<void> | null = null;

/** Refresh satu job dari disk (tanpa penandaan orphan — itu khusus boot). */
async function loadOne(id: string, fp: string, mtimeMs: number): Promise<Job | null> {
  try {
    const j = JSON.parse(await fs.readFile(fp, "utf8")) as Job;
    if (j?.id === id) {
      jobs.set(id, j);
      diskMtime.set(id, mtimeMs);
      return j;
    }
  } catch {
    /* file korup — skip */
  }
  return null;
}

/** Baca semua job json dari disk. `loaded` hanya true SETELAH baca dir tuntas. */
async function loadAll(): Promise<void> {
  try {
    for (const f of await fs.readdir(JOBS_DIR)) {
      if (!f.endsWith(".json")) continue;
      const id = f.slice(0, -5);
      const fp = path.join(JOBS_DIR, f);
      try {
        const st = await fs.stat(fp);
        await loadOne(id, fp, st.mtimeMs);
      } catch {
        /* hilang di tengah jalan — skip */
      }
    }
  } catch {
    /* belum ada dir */
  }
  // job "run"/"queued" dari proses lama sudah mati → tandai fail agar UI tidak menggantung.
  // Stale = dibuat SEBELUM proses OS ini bangun (createdAt < PROC_BOOT_MS). Job yang dibuat
  // SETELAH boot milik proses hidup ini — Turbopack dev memuat instansi store baru per
  // rute/HMR; tanpa ambang ini job fresh salah ditandai mati saat poll pertama.
  for (const j of jobs.values()) {
    if ((j.status === "run" || j.status === "queued") && j.createdAt < PROC_BOOT_MS) {
      j.status = "fail";
      j.error = j.error || "proses lama mati (sandbox di-recycle) — jalankan ulang";
    }
  }
  loaded = true;
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  if (!loadPromise) {
    startSweeper(); // fire-and-forget — tidak pernah memblokir load
    loadPromise = loadAll().finally(() => {
      loadPromise = null; // bila gagal, request berikutnya boleh coba muat ulang
    });
  }
  await loadPromise;
}

/** Tulis json job: ke file sementara lalu rename atomik — pembaca tidak
 *  pernah melihat json setengah jadi. Gagal persist tidak mematikan pipeline. */
export async function persist(job: Job): Promise<void> {
  const fp = path.join(JOBS_DIR, `${job.id}.json`);
  const tmp = `${fp}.tmp-${randomUUID()}`;
  try {
    await fs.mkdir(JOBS_DIR, { recursive: true });
    await fs.writeFile(tmp, JSON.stringify(job), "utf8");
    await fs.rename(tmp, fp);
  } catch {
    // bersihkan tmp yang tertinggal; kegagalan persist tidak boleh ikut naik
    void fs.rm(tmp, { force: true }).catch(() => {});
  }
}

export async function allJobs(): Promise<Job[]> {
  await ensureLoaded();
  // gabungkan json yang lebih baru di disk — tahan multi-instance module (hot reload)
  try {
    const files = await fs.readdir(JOBS_DIR);
    await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          const id = f.slice(0, -5);
          const fp = path.join(JOBS_DIR, f);
          try {
            const st = await fs.stat(fp);
            if (st.mtimeMs > (diskMtime.get(id) ?? 0)) await loadOne(id, fp, st.mtimeMs);
          } catch {
            /* hilang — skip */
          }
        })
    );
  } catch {
    /* belum ada dir */
  }
  return [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getJob(id: string): Promise<Job | undefined> {
  await ensureLoaded();
  try {
    const fp = path.join(JOBS_DIR, `${id}.json`);
    const st = await fs.stat(fp);
    if (st.mtimeMs > (diskMtime.get(id) ?? 0)) {
      const j = await loadOne(id, fp, st.mtimeMs);
      if (j) return j;
    }
  } catch {
    /* belum ada di disk */
  }
  return jobs.get(id);
}

/** Salinan job untuk respons API — isi cookies (kredensial YouTube yang
 *  di-paste user) tidak boleh keluar dari server. Input lain tetap ikut. */
export function publicJob(job: Job): Job {
  if (!job.inputs) return { ...job };
  const { cookies, ...inputs } = job.inputs;
  void cookies;
  return { ...job, inputs };
}

/** Usia maksimum job/media/upload sebelum dibuang penyapu (default 48 jam). */
export const JOB_TTL_MS = Number(process.env.VL_TTL_HOURS || 48) * 3600 * 1000;
const SWEEP_INTERVAL_MS = 30 * 60 * 1000;

type SweeperGlobal = typeof globalThis & { __viralinSweeperStarted?: boolean };
const sweeperGlobal = globalThis as SweeperGlobal;

/** Jalankan penyapu TTL sekali: (a) job kadaluarsa (json + dir media),
 *  (b) dir media yatim tanpa json, (c) file upload kadaluarsa. */
async function sweepOnce(): Promise<void> {
  const now = Date.now();

  // (a) job json lebih tua dari TTL → buang json beserta dir medianya data/<id>/
  try {
    for (const f of await fs.readdir(JOBS_DIR)) {
      if (!f.endsWith(".json")) continue;
      const id = f.slice(0, -5);
      if (id === "jobs" || id === "uploads") continue; // jaga-jaga nama aneh
      const jsonPath = path.join(JOBS_DIR, f);
      let expired = false;
      try {
        expired = now - (await fs.stat(jsonPath)).mtimeMs > JOB_TTL_MS;
      } catch {
        continue; // json hilang di tengah jalan — bagian (b) yang urus medianya
      }
      if (!expired) continue;
      try {
        await fs.rm(path.join(DATA, id), { recursive: true, force: true });
      } catch {
        /* gagal hapus dir — dicoba lagi di sweep berikutnya */
      }
      try {
        await fs.rm(jsonPath, { force: true });
      } catch {
        /* json mungkin sudah dihapus proses lain */
      }
      jobs.delete(id);
    }
  } catch {
    /* belum ada dir jobs */
  }

  // (b) dir media yatim tanpa json — umur memakai mtime dir sebagai fallback
  try {
    for (const ent of await fs.readdir(DATA, { withFileTypes: true })) {
      if (!ent.isDirectory() || ent.name === "jobs" || ent.name === "uploads") continue;
      const mediaDir = path.join(DATA, ent.name);
      const hasJson = await fs.stat(path.join(JOBS_DIR, `${ent.name}.json`)).catch(() => null);
      if (hasJson) continue; // json masih ada — bagian (a) yang urus
      try {
        if (now - (await fs.stat(mediaDir)).mtimeMs > JOB_TTL_MS) {
          await fs.rm(mediaDir, { recursive: true, force: true });
          jobs.delete(ent.name);
        }
      } catch {
        /* dir hilang di tengah jalan — skip */
      }
    }
  } catch {
    /* belum ada dir data */
  }

  // (c) file upload kadaluarsa di data/uploads/
  try {
    for (const ent of await fs.readdir(UPLOADS_DIR, { withFileTypes: true })) {
      if (!ent.isFile()) continue;
      const fp = path.join(UPLOADS_DIR, ent.name);
      try {
        if (now - (await fs.stat(fp)).mtimeMs > JOB_TTL_MS) {
          await fs.rm(fp, { force: true });
        }
      } catch {
        /* file hilang di tengah jalan — skip */
      }
    }
  } catch {
    /* belum ada dir uploads */
  }
}

/** Mulai penyapu TTL (interval 30 menit, unref). Flag globalThis mencegah
 *  interval ganda saat Next.js HMR memuat ulang module ini. */
export function startSweeper(): void {
  if (sweeperGlobal.__viralinSweeperStarted) return;
  sweeperGlobal.__viralinSweeperStarted = true;
  const timer = setInterval(() => void sweepOnce().catch(() => {}), SWEEP_INTERVAL_MS) as unknown as {
    unref?: () => void;
  };
  timer.unref?.();
}
