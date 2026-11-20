/** POST /api/upload — simpan file (video/gambar/cookies.txt) ke data/uploads/.
 *  Response: { ref: "<uploadId>:<nama>", uploadId, name, bytes } — ref dipakai
 *  sebagai nilai field `source`, uploadId untuk cookies. */
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { UPLOAD_DIR } from "@/lib/mediakit";

const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "bukan multipart/form-data" }, { status: 400 });
  }
  const f = form.get("file");
  if (!(f instanceof File)) {
    return Response.json({ error: "field 'file' wajib ada" }, { status: 400 });
  }
  if (f.size > MAX_BYTES) {
    return Response.json({ error: "file terlalu besar (maks 200MB)" }, { status: 413 });
  }
  const safe = (f.name || "file.bin").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const name = `${randomUUID().slice(0, 8)}-${safe}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await f.arrayBuffer()));
  return Response.json({ ref: `<uploadId>:${name}`, uploadId: name, name: f.name, bytes: f.size });
}
