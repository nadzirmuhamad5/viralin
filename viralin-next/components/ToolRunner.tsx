"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Job } from "@/lib/store";
import { PRESETS, DEFAULT_PRESET } from "@/lib/captions";
import type { ToolDef, ToolField } from "@/lib/tools";
import { motionDurationFrames, PALETTES, type MotionStudioProps, type WarnaId } from "@/lib/motion";
import { MotionStudio } from "@/remotion/MotionStudio";
import JobPanel from "./JobPanel";

/** Player Remotion — client-only (pola resmi Remotion + Next: ssr:false). */
const Player = dynamic(() => import("@remotion/player").then((m) => m.Player), { ssr: false });

/** Form + submit + polling untuk SATU tool — dipakai di halaman /fitur/[slug]. */
export default function ToolRunner({ tool }: { tool: ToolDef }) {
  const [formVals, setFormVals] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of tool.fields) init[f.key] = f.default || "";
    return init;
  });
  const [job, setJob] = useState<Job | null>(null);
  const [history, setHistory] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cookies, setCookies] = useState<{ id: string; name: string } | null>(null);
  const [cookiesText, setCookiesText] = useState("");
  const hasSource = tool.fields.some((f) => f.key === "source");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Props live untuk preview Player — hanya tool motion-studio. */
  const previewProps = useMemo<MotionStudioProps>(() => ({
    judul: (formVals.judul || "VIRALIN").toUpperCase().slice(0, 40),
    bullets: formVals.bullets || "",
    cta: formVals.cta || "FOLLOW SEKARANG",
    warna: (PALETTES[formVals.warna as WarnaId] ? formVals.warna : "green") as WarnaId,
    sfx: (formVals.sfx || "ya") !== "tidak",
  }), [formVals]);

  const stopPoll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  /** Riwayat job tool ini — dari store persisten (data/jobs/*.json), bertahan antar restart. */
  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/jobs", { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as { jobs: Job[] };
      // job lama tanpa kolom tool = klip-ai
      setHistory(j.jobs.filter((x) => (x.tool || "klip-ai") === tool.id).slice(0, 8));
    } catch {
      /* server belum siap — diulang saat job selesai */
    }
  }, [tool.id]);

  useEffect(() => {
    void loadHistory();
    return stopPoll;
  }, [loadHistory, stopPoll]);

  const watch = useCallback((id: string) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
        if (!r.ok) return;
        const j: Job = await r.json();
        setJob(j);
        if (j.status === "done" || j.status === "fail") {
          stopPoll();
          void loadHistory(); // refresh daftar riwayat
        }
      } catch {
        /* dev server restart — coba lagi */
      }
    }, 1500);
  }, [loadHistory, stopPoll]);

  const uploadField = async (key: string, f: File) => {
    setErr("");
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "upload gagal");
      setFormVals((v) => ({ ...v, [key]: j.ref }));
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  const uploadCookies = async (f: File) => {
    setErr("");
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "upload gagal");
      setCookies({ id: j.uploadId, name: f.name });
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
      setJob(j);
      watch(j.id);
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
          onChange={(e) => e.target.files?.[0] && uploadField(f.key, e.target.files[0])}
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
                onChange={(e) => e.target.files?.[0] && uploadCookies(e.target.files[0])}
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
        {tool.id === "motion-studio" && (
          <div className="fld" style={{ marginTop: 8 }}>
            <span>Preview live (Remotion Player)</span>
            <Player
              component={MotionStudio}
              inputProps={previewProps}
              durationInFrames={motionDurationFrames(previewProps)}
              compositionWidth={540}
              compositionHeight={960}
              fps={30}
              style={{ width: 270, maxWidth: "100%", borderRadius: 12, overflow: "hidden" }}
              controls
              autoPlay
              loop
            />
            <em className="fhint">Preview berubah langsung saat lu isi form. Hasil render server pakai SFX + font yang sama.</em>
          </div>
        )}
        {err && <div className="err">❌ {err}</div>}
        <button className="btn btn-white run" onClick={submit} disabled={running}>
          {running ? "⚙️ Memproses…" : "▶️ Jalankan"}
        </button>
      </div>
      {job && <JobPanel job={job} />}
      {history.length > 0 && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Riwayat {tool.name}</h3>
          <p className="mdesc">Tersimpan di server (persisten antar restart) — klik untuk buka lagi hasilnya.</p>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  stopPoll();
                  setJob(h);
                  if (h.status === "run" || h.status === "queued") watch(h.id);
                }}
                style={{
                  display: "flex", gap: 10, alignItems: "center", textAlign: "left",
                  padding: "10px 12px", borderRadius: 10, cursor: "pointer", width: "100%",
                  border: "1px solid rgba(255,255,255,.14)", color: "inherit",
                  background: h.id === job?.id ? "rgba(255,255,255,.10)" : "transparent",
                }}
              >
                <span aria-hidden>{h.status === "done" ? "✅" : h.status === "fail" ? "❌" : "⏳"}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {h.title || h.id}
                  </b>
                  <small style={{ opacity: 0.65 }}>
                    {new Date(h.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {h.clips?.length ? ` · ${h.clips.length} klip` : ""}
                    {h.files?.length ? ` · ${h.files.length} file` : ""}
                    {h.status === "fail" && h.error ? ` · ${(h.error || "").slice(0, 60)}` : ""}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
