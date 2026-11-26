"use client";

import { useState } from "react";
import type { Job } from "@/lib/store";
import { PRESETS, DEFAULT_PRESET } from "@/lib/captions";
import type { ToolDef, ToolField } from "@/lib/tools";
import { useJobPolling } from "@/lib/use-job-polling";
import JobPanel from "./JobPanel";

/** Respons sukses POST /api/upload. */
type UploadResponse = { ref: string; uploadId: string; name: string; bytes: number };

/** Form + submit + polling untuk SATU tool — dipakai di halaman /fitur/[slug]. */
export default function ToolRunner({ tool }: { tool: ToolDef }) {
  const [formVals, setFormVals] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of tool.fields) init[f.key] = f.default || "";
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cookies, setCookies] = useState<{ id: string; name: string } | null>(null);
  const [cookiesText, setCookiesText] = useState("");
  const hasSource = tool.fields.some((f) => f.key === "source");

  // Job dari respons POST disimpan di `seed` supaya panel langsung tampil tanpa
  // menunggu poll pertama; hasil poll terbaru (via hook) yang lebih baru menang.
  const [seed, setSeed] = useState<Job | null>(null);
  const [watchId, setWatchId] = useState<string | null>(null);
  const { job: polledJob } = useJobPolling(watchId);
  const job = polledJob ?? seed;

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
            ...(cookies?.id || cookiesText.trim()
              ? { cookies: cookies?.id || cookiesText.trim() }
              : {}),
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
            <label className="fld" key="cookies">
              <span>Cookies YouTube/TikTok (opsional)</span>
              <input
                type="file"
                accept=".txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(file, (j) => setCookies({ id: j.uploadId, name: file.name }));
                }}
              />
              <textarea
                rows={4}
                placeholder="…atau paste langsung isi cookies.txt di sini (mulai dengan &quot;# Netscape HTTP Cookie File&quot;)"
                value={cookiesText}
                onChange={(e) => setCookiesText(e.target.value)}
              />
              <em className="fhint">
                Kena bot-check YouTube? Pasang ekstensi &quot;Get cookies.txt LOCALLY&quot; → buka
                youtube.com dalam keadaan login → Export → <b>upload file-nya ATAU paste isinya</b> di
                sini, lalu jalankan lagi.
              </em>
              {cookies && <em className="fhint">✅ cookies siap (file): {cookies.name}</em>}
              {cookiesText.trim() && (
                <em className="fhint">
                  ✅ cookies siap (paste): {cookiesText.trim().split(/\r?\n/).length} baris
                </em>
              )}
            </label>
          )}
        </div>
        {err && <div className="err">❌ {err}</div>}
        <button className="btn btn-white run" onClick={submit} disabled={running}>
          {running ? "⚙️ Memproses…" : "▶️ Jalankan"}
        </button>
      </div>
      {job && <JobPanel job={job} />}
    </>
  );
}
