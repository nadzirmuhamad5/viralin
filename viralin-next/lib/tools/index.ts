/** Registry STATIS tool → runner. Semua modul per-tool dimuat sekali di level
 *  modul (dulu: 16 closure + registry dibangun ulang pada setiap panggilan runTool). */
import type { ToolCtx } from "./_shared";
import { run as aturManual } from "./atur-manual";
import { run as mergeVideo } from "./merge-video";
import { run as seamlessLoop } from "./seamless-loop";
import { run as waStoryHd } from "./wa-story-hd";
import { run as brandKit } from "./brand-kit";
import { run as thumbnail } from "./thumbnail";
import { run as highlightBola } from "./highlight-bola";
import { run as motionGraphic } from "./motion-graphic";
import { run as motionStudio } from "./motion-studio";
import { run as kontenTempel } from "./konten-tempel";
import { run as rageBait } from "./ragebait";
import { run as viralKonten } from "./viral-konten";
import { run as transcript } from "./transcript";
import { run as titleOptimizer } from "./title-optimizer";
import { run as viralTips } from "./viral-tips";
import { run as promptGen } from "./prompt-gen";
import { run as aiImage } from "./ai-image";
import { run as dubbing } from "./dubbing";
import { run as musicGen } from "./music-gen";

export type { ToolCtx, Log } from "./_shared";

export const TOOL_RUNNERS: Record<string, (ctx: ToolCtx) => Promise<void>> = {
  "atur-manual": aturManual,
  "merge-video": mergeVideo,
  "seamless-loop": seamlessLoop,
  "wa-story-hd": waStoryHd,
  "brand-kit": brandKit,
  thumbnail: thumbnail,
  "highlight-bola": highlightBola,
  "motion-graphic": motionGraphic,
  "motion-studio": motionStudio,
  "konten-tempel": kontenTempel,
  ragebait: rageBait,
  "viral-konten": viralKonten,
  transcript: transcript,
  "title-optimizer": titleOptimizer,
  "viral-tips": viralTips,
  "prompt-gen": promptGen,
  "ai-image": aiImage,
  dubbing: dubbing,
  "music-gen": musicGen,
};
