/** Konfigurasi terpusat — dipakai mediakit, whisperd, pipeline & tool tools.
 *  Semua path kini portable (relatif ke cwd / env var), bukan hardcode sandbox. */
import path from "path";
import fs from "fs";
import os from "os";

export const PY = process.env.PYTHON || "python3";

/** Folder dependensi python (yt-dlp, faster-whisper, edge-tts) — di-PYTHONPATH-kan. */
export const DEPS = process.env.VL_DEPS || path.join(process.cwd(), ".deps");
export const YTDLP = path.join(DEPS, "bin", "yt-dlp");

export const ENV: NodeJS.ProcessEnv = {
  ...process.env,
  HF_HOME: process.env.VL_HF_HOME || path.join(process.cwd(), ".cache", "huggingface"),
  PYTHONPATH: DEPS,
};

export const WHISPER_MODEL = process.env.VL_WHISPER_MODEL || "small";
export const WHISPER_LANG = process.env.VL_WHISPER_LANGUAGE || "id";
export const MAX_SECONDS = Number(process.env.VL_MAX_SECONDS || 900); // 15 menit

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
export const FONTS_DIR = path.join(process.cwd(), "assets", "caption-fonts");

/** CLI z-ai (chat GLM + image gen) — bisa ditimpa via VL_ZAI. */
export const ZAI_BIN = process.env.VL_ZAI || "z-ai";
/** Model chat — DeepSeek via Aria Router (pengganti z.ai; key z.ai lama sudah diganti di .z-ai-config). */
export const ZAI_MODEL = "deepseek-flash";

/** Baca .z-ai-config (dipakai SDK z-ai; berisi {baseUrl, apiKey} Aria). */
function readZaiConfig(): { baseUrl?: string; apiKey?: string } {
  for (const p of [path.join(process.cwd(), ".z-ai-config"), path.join(os.homedir(), ".z-ai-config"), "/etc/.z-ai-config"]) {
    try { return JSON.parse(fs.readFileSync(p, "utf8")) as { baseUrl?: string; apiKey?: string }; } catch { /* coba lokasi berikutnya */ }
  }
  return {};
}
const zaiCfg = readZaiConfig();

/** Provider LLM teks — semuanya OpenAI-compatible (POST {baseUrl}/chat/completions). */
export const LLM_PROVIDERS = {
  /** Aria Router (default) — key dari .z-ai-config. */
  aria: { baseUrl: zaiCfg.baseUrl || "https://router.ariaseta.com/v1", apiKey: zaiCfg.apiKey || "", model: ZAI_MODEL },
  /** 1min.ai — key dari env ONEMIN_API_KEY. */
  onemin: { baseUrl: "https://api.1min.ai/openai/v1", apiKey: process.env.ONEMIN_API_KEY || "", model: process.env.ONEMIN_MODEL || "gpt-4.1-mini" },
  /** Gemini (jalur OpenAI-compatible) — key dari env GEMINI_API_KEY. */
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", apiKey: process.env.GEMINI_API_KEY || "", model: process.env.GEMINI_MODEL || "gemini-2.5-flash" },
} as const;
export type LLMProviderId = keyof typeof LLM_PROVIDERS;
/** Pilih provider via env LLM_PROVIDER (aria | onemin | gemini). */
export const LLM_PROVIDER = process.env.LLM_PROVIDER || "aria";
