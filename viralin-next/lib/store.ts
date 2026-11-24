/** Job store: state in-memory + persist JSON ke data/jobs/ (bertahan antar restart). */
import { promises as fs } from "fs";
import path from "path";

export const DATA = path.join(process.cwd(), "data");
const JOBS_DIR = path.join(DATA, "jobs");

export type StageStatus = "pending" | "run" | "done" | "fail";
export type Stage = { name: string; label: string; status: StageStatus; ms?: number };

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
let loaded = false;

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    for (const f of await fs.readdir(JOBS_DIR)) {
      if (!f.endsWith(".json")) continue;
      try {
        const j = JSON.parse(await fs.readFile(path.join(JOBS_DIR, f), "utf8")) as Job;
        if (j?.id && !jobs.has(j.id)) {
          // job "run"/"queued" dari proses lama sudah mati → tandai fail agar UI tidak menggantung
          if (j.status === "run" || j.status === "queued") {
            j.status = "fail";
            j.error = j.error || "proses lama mati (sandbox di-recycle) — jalankan ulang";
          }
          jobs.set(j.id, j);
        }
      } catch {
        /* file korup — skip */
      }
    }
  } catch {
    /* belum ada dir */
  }
}

export async function persist(job: Job): Promise<void> {
  try {
    await fs.mkdir(JOBS_DIR, { recursive: true });
    await fs.writeFile(path.join(JOBS_DIR, `${job.id}.json`), JSON.stringify(job), "utf8");
  } catch {
    /* persist gagal tidak boleh mematikan pipeline */
  }
}

export async function allJobs(): Promise<Job[]> {
  await ensureLoaded();
  return [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getJob(id: string): Promise<Job | undefined> {
  await ensureLoaded();
  return jobs.get(id);
}
