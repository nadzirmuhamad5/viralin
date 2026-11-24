/** Berita → Motion Studio otomatis. Sumber: RSS Google News Indonesia
 *  (gratis, tanpa API key). Topik dirotasi per hari, headline yang sudah
 *  dipakai diingat di data/berita-state.json supaya tiap hari beda. */
import fs from "node:fs/promises";
import path from "node:path";
import { run } from "./exec";

export type NewsItem = { title: string; source: string; date: string; link: string };

const RSS_BASE = "https://news.google.com/rss";
const IDQ = "hl=id&gl=ID&ceid=ID:id";

const decodeEntities = (s: string) => s
  .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Parse item RSS minimally (tanpa depensi XML). */
export function parseRssItems(xml: string, max = 20): NewsItem[] {
  const items: NewsItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && items.length < max) {
    const block = m[1];
    const pick = (tag: string) => {
      const t = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(block);
      return t ? decodeEntities(t[1].trim()) : "";
    };
    const title = pick("title");
    if (!title) continue;
    // Google News: "Judul - Sumber" → pisahkan
    let head = title; let source = "";
    const dash = title.lastIndexOf(" - ");
    if (dash > 10) { head = title.slice(0, dash); source = title.slice(dash + 3); }
    items.push({ title: head, source, date: pick("pubDate"), link: pick("link") });
  }
  return items;
}

/** Headline Google News Indonesia. query kosong = headline utama. */
export async function newsHeadlines(query: string, log?: (l: string) => void, max = 20): Promise<NewsItem[]> {
  const url = query.trim()
    ? `${RSS_BASE}/search?q=${encodeURIComponent(query.trim())}&${IDQ}`
    : `${RSS_BASE}?${IDQ}`;
  log?.(`[berita] ambil RSS Google News${query.trim() ? ` (${query.trim()})` : " (utama)"}…`);
  const r = await run(["curl", "-s", "--max-time", "25", url], { timeout: 30_000 });
  if (!r.stdout.includes("<item>")) throw new Error("RSS Google News kosong/gagal — coba lagi atau isi rubrik lain");
  return parseRssItems(r.stdout, max);
}

/* ── state: headline yang sudah dipakai + hari terakhir jalan ── */
const STATE = path.join(process.cwd(), "data", "berita-state.json");
export type UsedState = { used: Record<string, string>; lastRunDate?: string };

export async function loadState(): Promise<UsedState> {
  const j = (JSON.parse(await fs.readFile(STATE, "utf8").catch(() => "{}")) || {}) as UsedState;
  if (!j.used) j.used = {};
  return j;
}
export async function saveState(s: UsedState): Promise<void> {
  await fs.mkdir(path.dirname(STATE), { recursive: true });
  await fs.writeFile(STATE, JSON.stringify(s));
}

const hashOf = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return String(h >>> 0); };

/** Pilih headline yang belum pernah dipakai + catat di state (persisten). */
export async function pickFreshItem(items: NewsItem[]): Promise<NewsItem> {
  const state = await loadState();
  const item = items.find((it) => !state.used[hashOf(it.title)]) || items[0];
  state.used[hashOf(item.title)] = new Date().toISOString();
  const keys = Object.keys(state.used);
  if (keys.length > 300) for (const k of keys.slice(0, keys.length - 300)) delete state.used[k];
  await saveState(state);
  return item;
}

/* ── rotasi topik + jam target ── */
export const BERITA_TOPICS = (process.env.BERITA_TOPICS ||
  "teknologi,ekonomi & bisnis,olahraga,lifestyle & viral,kesehatan,hiburan & musik")
  .split(",").map((s) => s.trim()).filter(Boolean);
export const BERITA_HOUR = Number(process.env.BERITA_HOUR || 7); // 07:00 WIB

/** Topik untuk hari ini: BERITA_TOPICS dirotasi per hari (day-of-year). */
export function topicForDay(d = new Date()): string {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const doy = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86400000);
  return BERITA_TOPICS[doy % BERITA_TOPICS.length];
}

/** Tanggal hari ini versi WIB (UTC+7). */
export function todayJakarta(d = new Date()): string {
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

/** Sudah waktunya video berita hari ini (lewat jam target & belum dibuat)? */
export function isDue(state: UsedState, now = new Date()): boolean {
  if (state.lastRunDate === todayJakarta(now)) return false;
  const h = new Date(now.getTime() + 7 * 3600_000).getUTCHours();
  return h >= BERITA_HOUR;
}
