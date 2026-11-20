/** GET /api/jobs/<id> — status job (dipakai client untuk polling). */
import { getJob } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return Response.json({ error: "job tidak ditemukan" }, { status: 404 });
  return Response.json(job);
}
