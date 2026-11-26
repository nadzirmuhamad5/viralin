/** Runner tool — dispatcher tipis; implementasi per-tool di lib/tools/.
 *  Catatan: import ke "./tools/index" (bukan "./tools") karena moduleResolution
 *  memprioritaskan file lib/tools.ts (registry UI TOOLS) di atas direktori. */
import { TOOL_RUNNERS, type ToolCtx } from "./tools/index";
import type { Job } from "./store";

export async function runTool(job: Job, dir: string, log: (l: string) => void): Promise<void> {
  const fn = TOOL_RUNNERS[job.tool || ""];
  if (!fn) throw new Error(`tool "${job.tool}" tidak dikenal`);
  const ctx: ToolCtx = { job, dir, inputs: job.inputs || {}, log };
  await fn(ctx);
}
