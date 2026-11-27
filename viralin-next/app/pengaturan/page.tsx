"use client";

import { useCallback, useEffect, useState } from "react";

type Acc = { id: string; name: string; platform: string; createdAt: number };

const PLATFORMS = [
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
];

/** Halaman Pengaturan — kelola akun cookies (nama akun + platform + isi cookies.txt).
 *  Isi cookies tidak pernah ditampilkan kembali; hanya nama + platform. */
export default function Pengaturan() {
  const [accs, setAccs] = useState<Acc[]>([]);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("youtube");
  const [cookies, setCookies] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/settings/cookies", { cache: "no-store" });
      const j = await r.json();
      setAccs(j.accounts || []);
    } catch {
      /* server restart */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setErr("");
    setOk("");
    if (!name.trim()) return setErr("Nama akun wajib diisi — mis. 'YT Akun Utama'");
    if (!cookies.trim()) return setErr("Paste isi cookies.txt dulu");
    setBusy(true);
    try {
      const r = await fetch("/api/settings/cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, platform, cookies }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "gagal simpan");
      setOk(`Akun "${name}" tersimpan — sekarang bisa dipilih di form tool yang butuh cookies.`);
      setName("");
      setCookies("");
      await load();
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string, nm: string) => {
    if (!confirm(`Hapus akun "${nm}"?`)) return;
    await fetch(`/api/settings/cookies?id=${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <section className="wrap sec">
      <h1 className="sec-h">⚙️ Pengaturan</h1>
      <p className="sec-sub">
        Kelola akun cookies TikTok/YouTube/Instagram di SATU tempat. Setelah disimpan, akun bisa
        dipilih langsung di form tool — tanpa paste-paste cookies berulang.
      </p>

      <div className="panel" style={{ marginTop: 0 }}>
        <div className="fields">
          <label className="fld">
            <span>Nama akun *</span>
            <input
              type="text"
              placeholder="mis. TikTok Akun Main / YT Akun Utama"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="fld">
            <span>Platform</span>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span>Isi cookies.txt *</span>
            <textarea
              rows={6}
              placeholder={'Paste isi cookies.txt di sini (mulai dengan "# Netscape HTTP Cookie File")…'}
              value={cookies}
              onChange={(e) => setCookies(e.target.value)}
            />
            <em className="fhint">
              Cara ambil: pasang ekstensi &quot;Get cookies.txt LOCALLY&quot; → buka platform dalam
              keadaan login → Export → paste isinya di sini. Isi cookies disimpan di server dan
              tidak pernah ditampilkan/dikirim ke browser lagi.
            </em>
          </label>
        </div>
        {err && <div className="err">❌ {err}</div>}
        {ok && <div className="err" style={{ borderColor: "var(--acc)" }}>✅ {ok}</div>}
        <button className="btn btn-white run" onClick={submit} disabled={busy}>
          {busy ? "⏳ Menyimpan…" : "💾 Simpan akun"}
        </button>
      </div>

      <div className="panel">
        <h2 className="sec-h" style={{ marginTop: 0 }}>
          🔑 Akun tersimpan ({accs.length})
        </h2>
        {accs.length === 0 ? (
          <p className="mdesc dim">Belum ada akun. Tambahkan di form atas — tool yang butuh cookies akan menampilkannya sebagai pilihan.</p>
        ) : (
          <div>
            {accs.map((a) => (
              <div className="jrow" key={a.id}>
                <span>{a.platform === "youtube" ? "▶️" : a.platform === "tiktok" ? "🎵" : "📸"}</span>
                <span className="ttl">
                  {a.name} <span className="st">· {a.platform} · {new Date(a.createdAt).toLocaleDateString("id-ID")}</span>
                </span>
                <button className="chip" onClick={() => del(a.id, a.name)} title="Hapus akun">
                  🗑️ Hapus
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
