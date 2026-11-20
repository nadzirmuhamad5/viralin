/** GET /api/jobs/<id>/media/<file> — stream hasil job (klip/thumb/srt/…),
 *  mendukung HTTP Range supaya <video> bisa seek. */
import { createReadStream, promises as fs } from "fs";
import { Readable } from "stream";
import path from "path";
import { DATA, getJob } from "@/lib/store";

const MIME: Record<string, string> = {
  ".mp4": "video/mp4", ".webm": "video/webm", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".webp": "image/webp", ".mp3": "audio/mpeg", ".m4a": "audio/mp4",
  ".wav": "audio/wav", ".srt": "text/plain; charset=utf-8", ".vtt": "text/vtt; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".ass": "text/plain; charset=utf-8",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; file: string }> }
) {
  const { id, file } = await params;
  const job = await getJob(id);
  if (!job) return new Response("job tidak ditemukan", { status: 404 });

  const safe = path.basename(decodeURIComponent(file));
  const fp = path.join(DATA, id, safe);
  if (!fp.startsWith(path.join(DATA, id)) || !(await fs.stat(fp).catch(() => null))) {
    return new Response("file tidak ditemukan", { status: 404 });
  }
  const size = (await fs.stat(fp)).size;
  const type = MIME[path.extname(safe).toLowerCase()] || "application/octet-stream";

  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
      if (start >= size || start > end) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      }
      const stream = Readable.toWeb(createReadStream(fp, { start, end })) as unknown as ReadableStream;
      return new Response(stream, {
        status: 206,
        headers: {
          "Content-Type": type,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store",
        },
      });
    }
  }
  const stream = Readable.toWeb(createReadStream(fp)) as unknown as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}
