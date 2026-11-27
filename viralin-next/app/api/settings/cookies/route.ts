/** API Pengaturan — kelola akun cookies TikTok/YouTube/IG.
 *  GET    → daftar akun TANPA isi cookies (aman untuk UI/tool picker)
 *  POST   {name, platform, cookies} → simpan akun baru
 *  DELETE ?id= → hapus akun */
import { listAccounts, saveAccount, deleteAccount } from "@/lib/cookie-store";

export async function GET() {
  return Response.json({ accounts: await listAccounts() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const platform = typeof body?.platform === "string" ? body.platform : "";
  const cookies = typeof body?.cookies === "string" ? body.cookies : "";
  if (!name) return Response.json({ error: "Nama akun wajib diisi" }, { status: 400 });
  if (!cookies.trim()) {
    return Response.json({ error: "Isi cookies.txt dulu (export dari ekstensi Get cookies.txt LOCALLY)" }, { status: 400 });
  }
  const acc = await saveAccount(name, platform, cookies);
  return Response.json({ account: acc });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "id wajib" }, { status: 400 });
  const ok = await deleteAccount(id);
  return Response.json({ ok });
}
