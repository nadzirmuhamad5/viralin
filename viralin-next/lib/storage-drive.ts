/**
 * Storage Google Drive — upload file hasil job (REST murni via curl, tanpa SDK).
 *
 * Konfigurasi di deploy/env lalu restart:
 *   export VL_GDRIVE_CLIENT_ID=...apps.googleusercontent.com
 *   export VL_GDRIVE_CLIENT_SECRET=...
 *   export VL_GDRIVE_REFRESH_TOKEN=...        # scope https://www.googleapis.com/auth/drive.file
 *   export VL_GDRIVE_FOLDER_ID=...            # opsional — folder tujuan
 *
 * Cara mendapat refresh token (sekali saja, ±5 menit):
 *   1. console.cloud.google.com → buat OAuth client (Web application)
 *      dengan redirect https://developers.google.com/oauthplayground
 *   2. di oauthplayground (gear ⚙️: "Use your own OAuth credentials")
 *      scope drive.file → Authorize → Exchange → salin refresh_token.
 */
import { promises as fs, writeFileSync } from "fs";
import { run, tailErr } from "./exec";

export function gdriveConfigured(): boolean {
  return !!(process.env.VL_GDRIVE_CLIENT_ID && process.env.VL_GDRIVE_CLIENT_SECRET && process.env.VL_GDRIVE_REFRESH_TOKEN);
}

let token = "";
let tokenExp = 0;

async function accessToken(log: (l: string) => void): Promise<string> {
  if (token && Date.now() < tokenExp) return token;
  const body = path_tmp(JSON.stringify({
    client_id: process.env.VL_GDRIVE_CLIENT_ID,
    client_secret: process.env.VL_GDRIVE_CLIENT_SECRET,
    refresh_token: process.env.VL_GDRIVE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  }));
  const r = await run(["curl", "-s", "--max-time", "25", "-X", "POST",
    "https://oauth2.googleapis.com/token",
    "-H", "Content-Type: application/json", "--data-binary", `@${body}`]);
  await fs.rm(body, { force: true });
  let j: { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  try { j = JSON.parse(r.stdout); } catch { throw new Error("Google Drive: balasan token tidak valid — " + tailErr(r.stderr || r.stdout)); }
  if (!j.access_token) {
    throw new Error(`Google Drive menolak kredensial (${j.error || "?"}): ${j.error_description || "cek VL_GDRIVE_* di deploy/env"}`);
  }
  token = j.access_token;
  tokenExp = Date.now() + Math.max(60, (j.expires_in || 3600) - 120) * 1000;
  log("[drive] token akses OK");
  return token;
}

function path_tmp(content: string): string {
  // writer kecil untuk body JSON pendek — hindari quoting shell
  const p = `/tmp/vl-gdrive-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  writeFileSync(p, content);
  return p;
}

const MIME: Record<string, string> = {
  ".mp4": "video/mp4", ".png": "image/png", ".jpg": "image/jpeg", ".srt": "text/plain",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".zip": "application/zip", ".txt": "text/plain",
};

/** Upload satu file → set permission siapa-saja-dengan-link → balik webViewLink. */
export async function gdriveUpload(localPath: string, name: string, log: (l: string) => void): Promise<string> {
  if (!gdriveConfigured()) {
    throw new Error("Google Drive belum dikonfigurasi — isi VL_GDRIVE_CLIENT_ID, VL_GDRIVE_CLIENT_SECRET, VL_GDRIVE_REFRESH_TOKEN (opsional VL_GDRIVE_FOLDER_ID) di deploy/env lalu restart.");
  }
  const tk = await accessToken(log);
  const mime = MIME[name.slice(name.lastIndexOf("."))] || "application/octet-stream";

  // 1) upload bytes
  const up = await run(["curl", "-s", "--max-time", "900", "-X", "POST",
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=media&fields=id",
    "-H", `Authorization: Bearer ${tk}`, "-H", `Content-Type: ${mime}`,
    "--data-binary", `@${localPath}`]);
  let meta: { id?: string; error?: { message?: string } };
  try { meta = JSON.parse(up.stdout); } catch { throw new Error("Google Drive: balasan upload tidak valid — " + tailErr(up.stderr || up.stdout)); }
  if (!meta.id) throw new Error(`Google Drive upload gagal: ${meta.error?.message || tailErr(up.stderr || up.stdout) || "tanpa id"}`);

  // 2) metadata: nama + folder tujuan
  const patchBody = path_tmp(JSON.stringify({ name, ...(process.env.VL_GDRIVE_FOLDER_ID ? { parents: [process.env.VL_GDRIVE_FOLDER_ID] } : {}) }));
  await run(["curl", "-s", "--max-time", "30", "-X", "PATCH",
    `https://www.googleapis.com/drive/v3/files/${meta.id}`,
    "-H", `Authorization: Bearer ${tk}`, "-H", "Content-Type: application/json",
    "--data-binary", `@${patchBody}`]);
  await fs.rm(patchBody, { force: true });

  // 3) permission: siapa saja dengan link → pembaca
  const permBody = path_tmp(JSON.stringify({ role: "reader", type: "anyone" }));
  const perm = await run(["curl", "-s", "--max-time", "30", "-X", "POST",
    `https://www.googleapis.com/drive/v3/files/${meta.id}/permissions`,
    "-H", `Authorization: Bearer ${tk}`, "-H", "Content-Type: application/json",
    "--data-binary", `@${permBody}`]);
  await fs.rm(permBody, { force: true });
  if (perm.code !== 0) log("[drive] warning: set permission gagal — link hanya untuk akunmu");

  return `https://drive.google.com/file/d/${meta.id}/view`;
}
