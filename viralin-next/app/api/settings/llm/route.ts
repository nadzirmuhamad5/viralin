/** API Pengaturan — provider LLM + key API.
 *  GET  → provider aktif + jumlah key + 4 karakter terakhir (TANPA nilai penuh)
 *  POST {provider?, keys?: {aria?, onemin?, gemini?}} → simpan
 *  (key kosong = biarkan yang lama; isi daftar baru untuk mengganti/menghapus) */
import { getLLMPublic, saveLLMSettings } from "@/lib/llm-store";

export async function GET() {
  return Response.json(await getLLMPublic());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const provider = typeof body?.provider === "string" ? body.provider : undefined;
  const keys =
    body?.keys && typeof body.keys === "object" ? (body.keys as Record<string, string>) : {};
  await saveLLMSettings({ provider, keys });
  return Response.json(await getLLMPublic());
}
