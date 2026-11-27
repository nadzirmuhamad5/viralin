/** Store akun cookies (Pengaturan) — data/cookies.json di server.
 *  Isi cookies sensitif → TIDAK PERNAH dikirim ke client; API hanya
 *  memberi daftar {id, name, platform}. Konten penuh hanya dipakai
 *  server saat job dibuat (resolve cookies_account → cookies mentah). */
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import path from "path";
import { DATA } from "./store";

const FILE = path.join(DATA, "cookies.json");

export type CookieAccount = {
  id: string;
  name: string;
  platform: string; // youtube | tiktok | instagram | lainnya
  cookies: string;
  createdAt: number;
};

type Db = { accounts: CookieAccount[] };

async function readDb(): Promise<Db> {
  try {
    const j = JSON.parse(await fs.readFile(FILE, "utf8")) as Db;
    if (Array.isArray(j.accounts)) return j;
  } catch {
    /* belum ada / korup → mulai baru */
  }
  return { accounts: [] };
}

async function writeDb(db: Db): Promise<void> {
  await fs.mkdir(DATA, { recursive: true });
  const tmp = `${FILE}.tmp-${randomUUID().slice(0, 8)}`;
  await fs.writeFile(tmp, JSON.stringify(db), "utf8");
  await fs.rename(tmp, FILE);
}

/** Daftar akun TANPA isi cookies (aman untuk UI). */
export async function listAccounts(): Promise<Array<Omit<CookieAccount, "cookies">>> {
  const db = await readDb();
  return db.accounts
    .map(({ cookies, ...a }) => {
      void cookies;
      return a;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Ambil isi cookies satu akun (khusus server). */
export async function getAccountCookies(id: string): Promise<string | null> {
  const db = await readDb();
  return db.accounts.find((a) => a.id === id)?.cookies || null;
}

export async function saveAccount(
  name: string,
  platform: string,
  cookies: string
): Promise<Omit<CookieAccount, "cookies">> {
  const db = await readDb();
  const acc: CookieAccount = {
    id: randomUUID().slice(0, 8),
    name: name.slice(0, 80),
    platform: ["youtube", "tiktok", "instagram"].includes(platform) ? platform : "lainnya",
    cookies: cookies.trim().slice(0, 60000),
    createdAt: Date.now(),
  };
  db.accounts.push(acc);
  await writeDb(db);
  const { cookies: _c, ...pub } = acc;
  void _c;
  return pub;
}

export async function deleteAccount(id: string): Promise<boolean> {
  const db = await readDb();
  const before = db.accounts.length;
  db.accounts = db.accounts.filter((a) => a.id !== id);
  await writeDb(db);
  return db.accounts.length < before;
}
