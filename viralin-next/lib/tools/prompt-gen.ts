/** Tool "prompt-gen" — ide mentah → prompt pro untuk AI video/image generator. */
import * as mk from "../mediakit";
import type { ToolCtx } from "./_shared";

export async function run(ctx: ToolCtx): Promise<void> {
  const { job, inputs, log } = ctx;
  const target = inputs.target === "image" ? "AI image generator" : "AI video generator";
  const out = await mk.zaiChat(
    `Kamu prompt engineer. Ubah ide mentah menjadi 1 prompt ${target} tinggal pakai: subjek detail, komposisi, lighting, gaya kamera, mood, dan negative prompt. Bahasa Indonesia, format rapi.`,
    `Ide: ${inputs.ide}`, log);
  job.texts!.push({ label: "Prompt siap pakai", body: out });
  job.title = "Generate Prompt";
  log("[prompt] jadi");
}
