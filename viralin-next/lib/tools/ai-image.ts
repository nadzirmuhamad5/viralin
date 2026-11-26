/** Tool "ai-image" (Klipers AI) — generator gambar via z-ai. */
import path from "path";
import * as mk from "../mediakit";
import type { ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, dir, inputs, log } = ctx;
  const size = /^(\d+x\d+)$/.test(inputs.size || "") ? inputs.size : "1024x1024";
  const out = path.join(dir, "gambar.png");
  await mk.zaiImage(inputs.prompt, out, log);
  job.files!.push({ file: "gambar.png", label: `Gambar AI ${size}`, kind: "image" });
  job.title = "Klipers AI — Gambar";
  log("[image] gambar jadi");
}
