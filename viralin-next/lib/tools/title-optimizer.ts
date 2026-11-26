/** Tool "title-optimizer" — LLM nilai & perbaiki judul video (skor CTR + alasan). */
import * as mk from "../mediakit";
import type { ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, inputs, log } = ctx;
  const platform = inputs.platform || "youtube";
  const raw = await mk.zaiChat(
    "Kamu ahli judul viral pasar Indonesia. Balas HANYA JSON: {\"judul\":[{\"t\":\"...\",\"skor\":0-100,\"alasan\":\"...\"}]} — 8 judul terbaik, terurut skor tertinggi. Judul maks 70 karakter.",
    `Judul sekarang: "${inputs.judul}". Platform: ${platform}. Berikan 8 alternatif judul dengan skor potensi klik.`, log);
  const j = mk.extractJson<{ judul: Array<{ t: string; skor: number; alasan: string }> }>(raw);
  const lines = j.judul.map((x, i) => `${i + 1}. [skor ${x.skor}] ${x.t}\n   ↳ ${x.alasan}`).join("\n");
  job.texts!.push({ label: "8 Judul Optimal (LLM gratis GLM)", body: lines });
  job.title = "Optimasi Judul";
  log("[judul] 8 alternatif siap");
}
