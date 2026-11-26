/** Tool "viral-tips" — LLM beri 5 ide konten + hook + CTA pasar Indonesia. */
import * as mk from "../mediakit";
import type { ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, inputs, log } = ctx;
  const raw = await mk.zaiChat(
    "Kamu strategist konten viral Indonesia. Balas HANYA JSON: {\"ide\":[{\"judul\":\"...\",\"hook\":\"...\",\"cta\":\"...\"}]} — 5 ide, hook maks 12 kata, CTA praktis.",
    `Niche akun: "${inputs.niche}". Konteks: pasar TikTok/Reels Indonesia 2026.`, log);
  const j = mk.extractJson<{ ide: Array<{ judul: string; hook: string; cta: string }> }>(raw);
  const lines = j.ide.map((x, i) =>
    `${i + 1}. ${x.judul}\n   Hook: "${x.hook}"\n   CTA: ${x.cta}`).join("\n");
  job.texts!.push({ label: "5 Ide Konten Viral", body: lines });
  job.title = "Saran Viral AI";
  log("[tips] 5 ide siap");
}
