/** Client untuk worker whisper RESIDENT (worker/whisper_server.py).
 *  Model dimuat sekali per proses python → tiap transkrip berikutnya hemat
 *  3–6 detik load model + spawn. Request diserialisasi (CPU-bound), stderr
 *  progres diteruskan ke pemanggil. Worker auto-respawn bila mati/idle-exit.
 *
 *  Kontrak error: semua kegagalan infrastruktur (spawn/boot/timeout/crash)
 *  ditandai prefix "whisperd:" → pemanggil (mediakit.transcribe) fallback ke
 *  worker per-proses. Error transkripsi murni (ok:false) diteruskan apa adanya.
 */
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { PY, WHISPER_MODEL, WHISPER_LANG, ENV } from "./config";

export type WhisperWord = { word: string; start: number; end: number };
export type WhisperSeg = { start: number; end: number; text: string; words?: WhisperWord[] };
export type WhisperInfo = { language: string; duration: number; segments: WhisperSeg[] };

const WORKER = path.join(process.cwd(), "worker", "whisper_server.py");
const BOOT_TIMEOUT_MS = 120_000;
const REQ_TIMEOUT_MS = 900_000;
const IDLE_EXIT_S = Math.ceil(Number(process.env.VL_WHISPERD_IDLE_MS || 600_000) / 1000);

let child: ChildProcess | null = null;
let ready = false;
let booting = false;
let unavailable = false; // import/model gagal saat boot → jangan dicoba lagi
let bufIn = "";
let seq = 0;
let bootResolve: (() => void) | null = null;
let bootReject: ((e: Error) => void) | null = null;
let bootPromise: Promise<void> | null = null;
let queueTail: Promise<unknown> = Promise.resolve(); // serialisasi request
/** progres stderr request yang sedang berjalan (serialisasi → aman satu variabel). */
let onLine: ((l: string) => void) | null = null;

type Pending = { resolve: (v: WhisperInfo) => void; reject: (e: Error) => void; timer: NodeJS.Timeout };
const waiters = new Map<number, Pending>();

function isWhisperdMsg(e: Error): Error {
  return new Error(e.message.startsWith("whisperd:") ? e.message : `whisperd: ${e.message}`);
}

function failAll(reason: string): void {
  for (const w of waiters.values()) {
    clearTimeout(w.timer);
    w.reject(new Error(`whisperd: ${reason}`));
  }
  waiters.clear();
}

function handleLine(line: string): void {
  if (!line.trim()) return;
  let msg: {
    ready?: boolean; error?: string; id?: number; ok?: boolean; info?: WhisperInfo;
  };
  try {
    msg = JSON.parse(line);
  } catch {
    return; // baris non-JSON — abaikan
  }
  if (msg.ready === true) {
    ready = true;
    bootResolve?.();
    return;
  }
  if (msg.ready === false) {
    unavailable = true; // gagal permanen (faster-whisper tak terpasang / model rusak)
    bootReject?.(new Error(`whisperd: ${msg.error || "worker tidak siap"}`));
    return;
  }
  const rid = msg.id;
  const w = rid != null ? waiters.get(rid) : undefined;
  if (rid == null || !w) return;
  waiters.delete(rid);
  clearTimeout(w.timer);
  if (msg.ok && msg.info) w.resolve(msg.info);
  else w.reject(new Error(String(msg.error || "transkripsi gagal"))); // error transkripsi murni — TANPA prefix
}

function stop(): void {
  if (child) {
    try {
      child.kill();
    } catch {
      /* sudah mati */
    }
  }
  child = null;
  ready = false;
}

function ensureReady(): Promise<void> {
  if (ready && child && !booting) return Promise.resolve();
  if (unavailable) {
    return Promise.reject(new Error("whisperd: tidak tersedia (faster-whisper gagal dimuat)"));
  }
  if (booting && bootPromise) return bootPromise;

  booting = true;
  bootPromise = new Promise<void>((resolve, reject) => {
    bootResolve = resolve;
    bootReject = reject;
    try {
      child = spawn(
        PY,
        [WORKER, "--model", WHISPER_MODEL, "--language", WHISPER_LANG, "--idle-exit", String(IDLE_EXIT_S)],
        // PYTHONPATH=.deps wajib — numpy/faster_whisper tinggal di folder .deps
        { stdio: ["pipe", "pipe", "pipe"], env: ENV }
      );
    } catch (e) {
      booting = false;
      reject(isWhisperdMsg(new Error(`spawn gagal: ${String((e as Error)?.message || e)}`)));
      return;
    }
    const bootTimer = setTimeout(() => {
      booting = false;
      stop();
      reject(new Error("whisperd: boot worker timeout"));
    }, BOOT_TIMEOUT_MS);

    const clearBootTimer = () => clearTimeout(bootTimer);
    const prevResolve = bootResolve;
    const prevReject = bootReject;
    bootResolve = () => {
      clearBootTimer();
      booting = false;
      prevResolve?.();
    };
    bootReject = (e) => {
      clearBootTimer();
      booting = false;
      stop();
      prevReject?.(e);
    };

    child.stdout?.on("data", (d: unknown) => {
      bufIn += String(d);
      const lines = bufIn.split("\n");
      bufIn = lines.pop() || "";
      lines.forEach(handleLine);
    });
    child.stderr?.on("data", (d: unknown) => {
      if (!onLine) return; // progres dibuang kalau tak ada pemanggil yang minta
      String(d)
        .split(/[\r\n]+/)
        .forEach((l) => l.trim().startsWith("[") && onLine?.(l.trim()));
    });
    child.on("error", (e) => {
      const err = isWhisperdMsg(new Error(`spawn gagal: ${e.message}`));
      if (booting) bootReject?.(err);
      else {
        ready = false;
        child = null;
        failAll(`proses worker error: ${e.message}`);
      }
    });
    child.on("exit", () => {
      child = null;
      ready = false;
      if (booting) bootReject?.(new Error("whisperd: worker keluar saat boot"));
      else if (waiters.size) failAll("proses worker keluar mendadak");
    });
  });
  return bootPromise;
}

function request(wav: string, log?: (l: string) => void): Promise<WhisperInfo> {
  const call = queueTail.then(async (): Promise<WhisperInfo> => {
    await ensureReady();
    const c = child;
    if (!c || !c.stdin || !ready) throw new Error("whisperd: worker mati mendadak");
    const id = ++seq;
    onLine = log || null;
    return new Promise<WhisperInfo>((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters.delete(id);
        onLine = null;
        stop(); // buang worker — respawn saat request berikutnya
        reject(new Error("whisperd: timeout transkripsi"));
      }, REQ_TIMEOUT_MS);
      waiters.set(id, { resolve, reject, timer });
      c.stdin?.write(JSON.stringify({ id, wav }) + "\n");
    }).finally(() => {
      onLine = null;
    });
  });
  queueTail = call.catch(() => undefined);
  return call;
}

/** Transkripsi via resident worker. Throws Error berprefix "whisperd:" bila infra gagal. */
export async function whisperdTranscribe(
  wav: string,
  log?: (l: string) => void
): Promise<WhisperInfo> {
  return request(wav, log);
}

/** True bila error berasal dari infrastruktur whisperd (→ fallback worker per-proses). */
export function isWhisperdUnavailable(e: unknown): boolean {
  return String((e as Error)?.message || e).startsWith("whisperd:");
}
