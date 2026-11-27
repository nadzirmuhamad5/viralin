"use client";

import { useCallback, useEffect, useState } from "react";

type Acc = { id: string; name: string; platform: string; createdAt: number };

type LlmInfo = {
  provider: string;
  counts: Record<string, number>;
  masked: Record<string, string[]>;
};

const LLM_PROVIDERS_UI = [
  { value: "aria", label: "Aria Router (deepseek-flash)" },
  { value: "onemin", label: "1min.ai (qwen3.7-flash)" },
  { value: "gemini", label: "Gemini (gemini-2.5-flash)" },
  { value: "openrouter", label: "OpenRouter (openrouter/free)" },
  { value: "ollama", label: "Ollama (deepseek-v4.1-flash)" },
];

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

  // ── Provider LLM ──
  const [llm, setLlm] = useState<LlmInfo | null>(null);
  const [llmProvider, setLlmProvider] = useState("aria");
  const [llmKeys, setLlmKeys] = useState({ aria: "", onemin: "", gemini: "", openrouter: "", ollama: "" });
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmErr, setLlmErr] = useState("");
  const [llmOk, setLlmOk] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/settings/cookies", { cache: "no-store" });
      const j = await r.json();
      setAccs(j.accounts || []);
    } catch {
      /* server restart */
    }
  }, []);

  const loadLlm = useCallback(async () => {
    try {
      const r = await fetch("/api/settings/llm", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "gagal memuat");
      setLlm(j);
      setLlmProvider(j.provider || "aria");
    } catch {
      /* server restart */
    }
  }, []);

  useEffect(() => {
    void load();
    void loadLlm();
  }, [load, loadLlm]);

  const saveLlm = async () => {
    setLlmErr("");
    setLlmOk("");
    setLlmBusy(true);
    try {
      const r = await fetch("/api/settings/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: llmProvider, keys: llmKeys }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "gagal simpan");
      setLlmOk(`Provider LLM sekarang "${llmProvider}" — berlaku langsung tanpa restart.`);
      setLlmKeys({ aria: "", onemin: "", gemini: "", openrouter: "", ollama: "" });
      await loadLlm();
    } catch (e) {
      setLlmErr(String((e as Error).message));
    } finally {
      setLlmBusy(false);
    }
  };

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

      <div className="panel">
        <h2 className="sec-h" style={{ marginTop: 0 }}>
          🤖 Provider LLM (teks generate)
        </h2>
        <p className="mdesc dim">
          Provider untuk semua generate teks (judul, naskah, tips, dll). Berlaku langsung tanpa
          restart. Key disimpan di server dan tidak pernah ditampilkan penuh — hanya 4 karakter
          terakhir. Key kosong = biarkan yang lama; isi daftar baru untuk mengganti/menghapus key.
        </p>
        <p className="mdesc dim">
          ⚠️ Aplikasi ini terbuka publik tanpa login — siapa pun yang membuka halaman ini bisa
          mengubah provider dan key. Batasi aksesnya kalau sudah dipakai serius.
        </p>
        <div className="fields">
          <label className="fld">
            <span>Provider aktif</span>
            <select value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)}>
              {LLM_PROVIDERS_UI.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {LLM_PROVIDERS_UI.map((p) => (
            <label className="fld" key={p.value}>
              <span>
                Key {p.label.split(" (")[0]}
                {llm
                  ? ` — ${llm.counts[p.value] || 0} tersimpan${llm.masked[p.value]?.length ? `: ${llm.masked[p.value].join(", ")}` : ""}`
                  : ""}
              </span>
              <textarea
                rows={2}
                placeholder="key1,key2 — pisah koma buat rotasi; kosong = biarkan lama"
                value={llmKeys[p.value as keyof typeof llmKeys]}
                onChange={(e) => setLlmKeys({ ...llmKeys, [p.value]: e.target.value })}
              />
            </label>
          ))}
        </div>
        {llmErr && <div className="err">❌ {llmErr}</div>}
        {llmOk && <div className="err" style={{ borderColor: "var(--acc)" }}>✅ {llmOk}</div>}
        <button className="btn btn-white run" onClick={saveLlm} disabled={llmBusy}>
          {llmBusy ? "⏳ Menyimpan…" : "💾 Simpan provider LLM"}
        </button>
      </div>
    </section>
  );
}
