/** POST /api/upload — simpan file (video/gambar/cookies.txt) ke data/uploads/.
 *  Response: { ref: "<uploadId>:<nama>", uploadId, name, bytes } — ref dipakai
 *  sebagai nilai field `source`, uploadId untuk cookies.
 *  File di-STREAM langsung ke disk (tanpa buffer memori) dengan penghitung
 *  byte; bila melebihi batas di tengah stream → 413 + file parsial dibuang. */
import { createWriteStream, promises as fs } from "fs";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
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
  const dest = path.join(UPLOAD_DIR, name);

  // streaming: adopsi web stream ke node stream
  const nodeStream = Readable.fromWeb(f.stream() as unknown as WebReadableStream);
  const out = createWriteStream(dest);
  let bytes = 0;
  let tooLarge = false;
  // transform penghitung byte — tolak begitu total melebihi batas
  const counter = new Transform({
    transform(chunk: Buffer, _enc: BufferEncoding, cb) {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) {
        tooLarge = true;
        cb(new Error("file terlalu besar (maks 200MB)"));
        return;
      }
      cb(null, chunk);
    },
  });

  try {
    // pipeline otomatis menghancurkan semua stream saat gagal
    await pipeline(nodeStream, counter, out);
  } catch {
    // buang file parsial supaya tidak jadi sampah
    await fs.rm(dest, { force: true }).catch(() => {});
    if (tooLarge) {
      return Response.json({ error: "file terlalu besar (maks 200MB)" }, { status: 413 });
    }
    return Response.json({ error: "gagal menyimpan file" }, { status: 500 });
  }
  return Response.json({ ref: `<uploadId>:${name}`, uploadId: name, name: f.name, bytes });
}
