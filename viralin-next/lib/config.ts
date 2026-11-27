/** Konfigurasi terpusat — dipakai mediakit, whisperd, pipeline & tool tools.
 *  Semua path kini portable (relatif ke cwd / env var), bukan hardcode sandbox. */
import path from "path";

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
