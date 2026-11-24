/** Sajikan file statis dari public/ langsung dari disk — dipakai renderer Remotion.
 *  `next start` TIDAK menyajikan file yang ditambahkan ke public/ SETELAH proses
 *  start (ilustrasi per-job ditulis belakangan) — route ini membaca disk saat
 *  request sehingga gambar job mana pun selalu tersedia.
 *  CATCH-ALL wajib: route datar hanya mencocokkan path persis, bukan sub-path. */
import { promises as fs } from "fs";
import path from "path";

// WAJIB dinamis: kalau tidak, Next mencoba prerender GET handler saat BUILD —
// saat itu file ilustrasi per-job belum ada → 404 ter-prerender & ter-cache.
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ttf": "font/ttf", ".json": "application/json",
};

type Ctx = { params: Promise<{ p?: string[] }> };

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const { p } = await ctx.params;
  const rel = (p || []).join("/").replace(/\\/g, "/");
  if (!rel || rel.includes("..")) return new Response("bad path", { status: 400 });
  try {
    const buf = await fs.readFile(path.join(process.cwd(), "public", rel));
    const type = TYPES[rel.slice(rel.lastIndexOf("."))] || "application/octet-stream";
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
