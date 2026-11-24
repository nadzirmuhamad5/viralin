/** Trigger manual penjadwal berita: POST/GET /api/berita/tick[?force=1&topik=olahraga]
 *  force=1 → bikin job sekarang (abaikan jam target & state harian). */
import { beritaTick } from "@/lib/scheduler";

async function handle(req: Request): Promise<Response> {
  const u = new URL(req.url);
  const force = u.searchParams.get("force") === "1";
  const topik = u.searchParams.get("topik") || undefined;
  try {
    return Response.json(await beritaTick({ force, topik }));
  } catch (e) {
    return Response.json({ ran: false, error: String((e as Error)?.message || e) }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
