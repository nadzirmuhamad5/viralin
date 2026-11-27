/** Store pengaturan LLM (Pengaturan) — data/llm.json di server.
 *  Key API sensitif → TIDAK PERNAH dikirim ke client; API hanya memberi
 *  jumlah key + 4 karakter terakhir. Nilai penuh hanya dipakai server
 *  saat zaiChat() dipanggil (resolveLLM). File ini di-gitignore. */
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import path from "path";
import { DATA } from "./store";
import { LLM_PROVIDERS, LLM_PROVIDER, type LLMProviderId } from "./config";

const FILE = path.join(DATA, "llm.json");

export type LLMFileSettings = {
  provider?: LLMProviderId;
  keys?: Partial<Record<LLMProviderId, string[]>>;
};

const PROVIDERS: LLMProviderId[] = ["aria", "onemin", "gemini", "openrouter"];

async function readFile(): Promise<LLMFileSettings> {
  try {
    const j = JSON.parse(await fs.readFile(FILE, "utf8")) as LLMFileSettings;
    if (j && typeof j === "object") return j;
  } catch {
    /* belum ada / korup → kosong */
  }
  return {};
}

async function writeFile(s: LLMFileSettings): Promise<void> {
  await fs.mkdir(DATA, { recursive: true });
  const tmp = `${FILE}.tmp-${randomUUID().slice(0, 8)}`;
  await fs.writeFile(tmp, JSON.stringify(s), "utf8");
  await fs.rename(tmp, FILE);
}

function splitKeys(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Simpan provider + key (key kosong = biarkan yang lama). */
export async function saveLLMSettings(input: {
  provider?: string;
  keys?: Partial<Record<string, string>>;
}): Promise<void> {
  const cur = await readFile();
  const next: LLMFileSettings = { ...cur, keys: { ...(cur.keys || {}) } };
  if (input.provider && (PROVIDERS as string[]).includes(input.provider)) {
    next.provider = input.provider as LLMProviderId;
  }
  for (const p of PROVIDERS) {
    const v = input.keys?.[p];
    if (typeof v === "string" && v.trim()) next.keys![p] = splitKeys(v);
  }
  await writeFile(next);
}

export type ResolvedLLM = {
  provider: LLMProviderId;
  baseUrl: string;
  model: string;
  keyEnv: string;
  apiKeys: string[];
  counts: Record<LLMProviderId, number>;
};

/** Key untuk provider tertentu (file Pengaturan dulu, lalu env). */
export async function getProviderKeys(p: LLMProviderId): Promise<string[]> {
  const file = await readFile();
  const fk = file.keys?.[p];
  return fk && fk.length ? fk : [...LLM_PROVIDERS[p].apiKeys];
}

/** Konfigurasi LLM efektif: file Pengaturan (kalau ada) menimpa env. */
export async function resolveLLM(): Promise<ResolvedLLM> {
  const file = await readFile();
  const provider = (file.provider || LLM_PROVIDER) as LLMProviderId;
  const base = LLM_PROVIDERS[provider];
  if (!base) throw new Error(`LLM_PROVIDER tidak dikenal: ${provider} (pilih: aria, onemin, gemini)`);
  const keysFor = (p: LLMProviderId): string[] => {
    const fk = file.keys?.[p];
    return fk && fk.length ? fk : [...LLM_PROVIDERS[p].apiKeys];
  };
  return {
    provider,
    baseUrl: base.baseUrl,
    model: base.model,
    keyEnv: base.keyEnv,
    apiKeys: keysFor(provider),
    counts: {
      aria: keysFor("aria").length,
      onemin: keysFor("onemin").length,
      gemini: keysFor("gemini").length,
      openrouter: keysFor("openrouter").length,
    },
  };
}

/** Tampilan aman untuk UI: provider aktif + jumlah key + 4 karakter terakhir key file. */
export async function getLLMPublic(): Promise<{
  provider: LLMProviderId;
  counts: Record<LLMProviderId, number>;
  masked: Record<LLMProviderId, string[]>;
}> {
  const eff = await resolveLLM();
  const file = await readFile();
  const masked = {} as Record<LLMProviderId, string[]>;
  for (const p of PROVIDERS) {
    masked[p] = (file.keys?.[p] || []).map((k) => `••••${k.slice(-4)}`);
  }
  return { provider: eff.provider, counts: eff.counts, masked };
}
