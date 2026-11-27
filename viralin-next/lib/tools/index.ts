/** Registry STATIS tool → runner. Semua modul per-tool dimuat sekali di level
 *  modul. 14 tool diprune dari registry (2026-11-26) per permintaan:
 *  atur-manual, highlight-bola, transcript, wa-story-hd, brand-kit,
 *  motion-graphic, merge-video, viral-konten, ai-image ("Klipers AI"),
 *  prompt-gen, music-gen, dubbing, voice-clone, thumbnail. */
import type { ToolCtx } from "./_shared";
import { run as seamlessLoop } from "./seamless-loop";
import { run as motionStudio } from "./motion-studio";
import { run as kontenTempel } from "./konten-tempel";
import { run as rageBait } from "./ragebait";
import { run as titleOptimizer } from "./title-optimizer";
import { run as viralTips } from "./viral-tips";
import { run as ugcAffiliate } from "./ugc-affiliate";

export type { ToolCtx, Log } from "./_shared";

export const TOOL_RUNNERS: Record<string, (ctx: ToolCtx) => Promise<void>> = {
  "seamless-loop": seamlessLoop,
  "motion-studio": motionStudio,
  "konten-tempel": kontenTempel,
  ragebait: rageBait,
  "title-optimizer": titleOptimizer,
  "viral-tips": viralTips,
  "ugc-affiliate": ugcAffiliate,
};
