import { allJobs, persist, publicJob } from "@/lib/store";
import { createJob, runJob } from "@/lib/pipeline";
import { PRESETS, DEFAULT_PRESET } from "@/lib/captions";
import { TOOL_BY_ID } from "@/lib/tools";
import { enqueue, queueStats } from "@/lib/queue";

export async function GET() {
  return Response.json({ jobs: (await allJobs()).map(publicJob) });
}

export async function POST(req: Request) {
  // antrean penuh → tolak lebih awal (job tidak sempat dibuat/persist)
  const stats = queueStats();
  if (stats.waiting >= stats.maxWaiting) {
    return Response.json(
      { error: "antrian penuh — coba lagi beberapa saat lagi" },
      { status: 429, headers: { "Retry-After": "30" } }
    );
  }
  const body = await req.json().catch(() => ({}));
  // mode baru: {tool, inputs:{...}, preset?} — mode lama: {url, preset?} tetap jalan
  const tool = typeof body?.tool === "string" && TOOL_BY_ID[body.tool] ? body.tool : "klip-ai";
  const def = TOOL_BY_ID[tool];
  if (!def?.live) {
    return Response.json(
      { error: `Tool "${tool}" belum bisa jalan di demo gratis ini` },
      { status: 400 }
    );
  }

  const rawInputs: Record<string, unknown> =
    body?.inputs && typeof body.inputs === "object" ? body.inputs : {};
  const inputs: Record<string, string> = {};
  for (const f of def.fields) {
    const v = rawInputs[f.key];
    if (typeof v === "string" || typeof v === "number") {
      inputs[f.key] = String(v).slice(0, 4000);
    }
  }
  // cookies opsional (anti bot-check YouTube/TikTok) — upload id ATAU paste mentah isi cookies.txt
  const ckRaw = rawInputs.cookies;
  if (typeof ckRaw === "string" && ckRaw.trim()) inputs.cookies = ckRaw.trim().slice(0, 20000);
  // mode legacy {url} → samakan ke inputs.source SEBELUM validasi wajib,
  // kalau tidak form hero landing page selalu kena "Field Video sumber wajib diisi"
  if (!inputs.source && typeof body?.url === "string" && body.url.trim()) {
    inputs.source = body.url.trim().slice(0, 4000);
  }
  // validasi field wajib
  for (const f of def.fields) {
    if (f.required && !inputs[f.key]?.trim()) {
      return Response.json({ error: `Field "${f.label}" wajib diisi` }, { status: 400 });
    }
  }
  // url legacy + sumber utama disamakan ke job.url
  const url =
    inputs.source ||
    inputs.sources?.split(/\n+/)[0] ||
    (typeof body?.url === "string" ? body.url.trim() : "");

  const preset =
    typeof body?.preset === "string" && PRESETS[body.preset] ? body.preset : DEFAULT_PRESET;
  if (tool === "klip-ai" && !/^https?:\/\/\S+$/i.test(url)) {
    return Response.json({ error: "URL http(s) wajib diisi" }, { status: 400 });
  }

  const job = createJob(url, preset, tool, inputs);
  await persist(job); // job harus sudah persist sebelum masuk antrian
  // Jalankan pipeline di background lewat antrian konkurensi — client polling via GET /api/jobs/<id>
  void enqueue(() => runJob(job)).catch(async (e: unknown) => {
    job.status = "fail";
    job.error = String((e as Error)?.message || e);
    await persist(job);
  });
  // balasan tidak boleh membawa cookies
  return Response.json(publicJob(job));
}
