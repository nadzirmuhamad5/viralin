"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Job } from "@/lib/store";
import { PRESETS, DEFAULT_PRESET } from "@/lib/captions";
import type { ToolDef, ToolField } from "@/lib/tools";
import { useJobPolling } from "@/lib/use-job-polling";
import JobPanel from "./JobPanel";

// Preview video hanya untuk motion-studio — dimuat malas supaya halaman tool
// lain tidak ikut mem-bundle @remotion/player.
const MotionPreview = dynamic(() => import("./MotionPreview"), { ssr: false });

/** Respons sukses POST /api/upload. */
type UploadResponse = { ref: string; uploadId: string; name: string; bytes: number };
type CookieAcc = { id: string; name: string; platform: string };

/** Form + submit + polling untuk SATU tool — dipakai di halaman /fitur/[slug]. */
export default function ToolRunner({ tool }: { tool: ToolDef }) {
  const [formVals, setFormVals] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of tool.fields) init[f.key] = f.default || "";
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const hasSource = tool.fields.some((f) => f.key === "source");
  // akun cookies dikelola di halaman Pengaturan — tool hanya memilih nama akun
  const [cookieAccs, setCookieAccs] = useState<CookieAcc[]>([]);
  const [cookieAcc, setCookieAcc] = useState("");

  // Job dari respons POST disimpan di `seed` supaya panel langsung tampil tanpa
  // menunggu poll pertama; hasil poll terbaru (via hook) yang lebih baru menang.
  const [seed, setSeed] = useState<Job | null>(null);
  const [watchId, setWatchId] = useState<string | null>(null);
  const { job: polledJob } = useJobPolling(watchId);
  const job = polledJob ?? seed;

  // daftar akun cookies dari Pengaturan (isinya tak pernah dikirim ke browser)
  useEffect(() => {
    if (!hasSource) return;
    fetch("/api/settings/cookies", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setCookieAccs(j.accounts || []))
      .catch(() => {});
  }, [hasSource]);

  /** Upload ke POST /api/upload — dipakai untuk field source (ambil `ref`)
   *  dan file cookies (ambil `uploadId`). Beda hanya di penanganan responsnya. */
  const upload = async (f: File, apply: (res: UploadResponse) => void) => {
    setErr("");
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "upload gagal");
      apply(j);
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  const submit = async () => {
    setErr("");
    const missing = tool.fields.find((f) => f.required && !formVals[f.key]?.trim());
    if (missing) {
      setErr(`Isi dulu: ${missing.label}`);
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: tool.id,
          inputs: {
            ...formVals,
            ...(cookieAcc ? { cookies_account: cookieAcc } : {}),
          },
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "gagal membuat job");
      setSeed(j);
      setWatchId(j.id);
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const renderField = (f: ToolField) => {
    if (f.key === "preset") {
      return (
        <select
          value={formVals[f.key] || DEFAULT_PRESET}
          onChange={(e) => setFormVals((v) => ({ ...v, [f.key]: e.target.value }))}
        >
          {Object.values(PRESETS).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.group})
            </option>
          ))}
        </select>
      );
    }
    if (f.type === "select") {
      return (
        <select
          value={formVals[f.key] || ""}
          onChange={(e) => setFormVals((v) => ({ ...v, [f.key]: e.target.value }))}
        >
          {(f.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    if (f.type === "textarea") {
      return (
        <textarea
          rows={3}
          placeholder={f.placeholder}
          value={formVals[f.key] || ""}
          onChange={(e) => setFormVals((v) => ({ ...v, [f.key]: e.target.value }))}
        />
      );
    }
    if (f.type === "upload") {
      return (
        <input
          type="file"
          accept="video/*,image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file, (j) => setFormVals((v) => ({ ...v, [f.key]: j.ref })));
          }}
        />
      );
    }
    return (
      <input
        type={f.type === "number" ? "number" : "text"}
        placeholder={f.placeholder}
        value={formVals[f.key] || ""}
        onChange={(e) => setFormVals((v) => ({ ...v, [f.key]: e.target.value }))}
      />
    );
  };

  const running = busy || job?.status === "run" || job?.status === "queued";

  return (
    <>
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="fields">
          {tool.fields.length === 0 && (
            <p className="mdesc">Tool ini tidak butuh input — langsung jalankan.</p>
          )}
          {tool.fields.map((f) => (
            <label className="fld" key={f.key}>
              <span>
                {f.label}
                {f.required ? " *" : ""}
              </span>
              {renderField(f)}
              {f.hint && <em className="fhint">{f.hint}</em>}
            </label>
          ))}
          {hasSource && (
            <label className="fld" key="cookies_account">
              <span>Akun cookies (opsional)</span>
              <select
                value={cookieAcc}
                onChange={(e) => setCookieAcc(e.target.value)}
              >
                <option value="">— tanpa cookies —</option>
                {cookieAccs.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.platform}
                  </option>
                ))}
              </select>
              <em className="fhint">
                Kelola daftar akun di menu <b>⚙️ Pengaturan</b> — cukup simpan sekali, pilih di sini
                setiap jalan. Isi cookies tidak pernah tampil di form tool.
              </em>
            </label>
          )}
        </div>
        {err && <div className="err">❌ {err}</div>}
        <button className="btn btn-white run" onClick={submit} disabled={running}>
          {running ? "⚙️ Memproses…" : "▶️ Jalankan"}
        </button>
      </div>
      {tool.id === "motion-studio" && <MotionPreview values={formVals} />}
      {job && <JobPanel job={job} />}
    </>
  );
}
