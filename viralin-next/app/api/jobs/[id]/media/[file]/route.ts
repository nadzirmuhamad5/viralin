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

// gambar hasil job boleh di-cache browser; sisanya dinamis → no-store
const CACHEABLE = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; file: string }> }
) {
  const { id, file } = await params;
  const job = await getJob(id);
  if (!job) return new Response("job tidak ditemukan", { status: 404 });

  const safe = path.basename(decodeURIComponent(file));
  const fp = path.join(DATA, id, safe);
  // satu fs.stat dipakai untuk cek keberadaan + ukuran file
  const st = await fs.stat(fp).catch(() => null);
  if (!fp.startsWith(path.join(DATA, id)) || !st) {
    return new Response("file tidak ditemukan", { status: 404 });
  }
  const size = st.size;
  const ext = path.extname(safe).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const cacheControl = CACHEABLE.has(ext) ? "public, max-age=3600" : "no-store";

  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      let start: number;
      let end: number;
      if (!m[1] && m[2]) {
        // suffix range "bytes=-N" → N byte terakhir
        start = Math.max(size - parseInt(m[2], 10), 0);
        end = size - 1;
      } else {
        start = m[1] ? parseInt(m[1], 10) : 0;
        end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
      }
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
          "Cache-Control": cacheControl,
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
      "Cache-Control": cacheControl,
    },
  });
}
