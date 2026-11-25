/** Eksekusi proses dengan streaming baris — dipakai mediakit & toolrun. */
import { execFile } from "child_process";

export type RunOpts = {
  env?: NodeJS.ProcessEnv;
  onLine?: (l: string) => void;
  timeout?: number; // ms
};

export function run(
  cmd: string[],
  opts: RunOpts = {}
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = execFile(
      cmd[0],
      cmd.slice(1),
      { maxBuffer: 64 << 20, timeout: opts.timeout ?? 600_000, env: opts.env ?? process.env },
      (err, stdout, stderr) => {
        if (err && err.killed) {
          reject(new Error(`timeout: ${cmd[0]}`));
        } else {
          resolve({
            code: err ? ((err as { code?: number }).code ?? 1) : 0,
            stdout: String(stdout),
            stderr: String(stderr),
          });
        }
      }
    );
    if (opts.onLine) {
      const pump = (d: unknown) =>
        String(d)
          .split(/[\r\n]+/)
          .forEach((l) => l.trim() && opts.onLine!(l));
      p.stdout?.on("data", pump);
      p.stderr?.on("data", pump);
    }
  });
}

/** Ambil 3 baris error terakhir (stderr) sebagai pesan ringkas. */
export function tailErr(s: string): string {
  const lines = s.split(/\r?\n/).filter((l) => l.trim());
  return lines.slice(-3).join(" · ").slice(0, 300) || "(kosong)";
}
