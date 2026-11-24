"use client";

import Link from "next/link";
import type { Job } from "@/lib/store";

const ICO: Record<string, string> = { pending: "⏳", run: "⚙️", done: "✅", fail: "❌" };
const FILE_ICO: Record<string, string> = {
  video: "🎬", image: "🖼️", subtitle: "📝", audio: "🎵",
};

const MB = (b: number) => (b / 1e6).toFixed(2) + " MB";
const fmt = (s?: number) =>
  s == null ? "—" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** Panel hasil job: tahapan, log live, klip/video, file, teks — taxidipakai semua halaman. */
export default function JobPanel({ job }: { job: Job }) {
  return (
    <div className="panel" data-job={job.id}>
      {/* tahapan */}
      <div className="stages">
        {job.stages.map((s) => (
          <span className={`stage st-${s.status}`} key={s.name}>
            {ICO[s.status]} {s.label}
          </span>
        ))}
      </div>

      {job.error && <div className="err">❌ {job.error}</div>}

      {/* klip vertikal */}
      {job.clips.length > 0 && (
        <div className="hscroll">
          {job.clips.map((c) => (
            <div className="clip" key={c.file}>
              <video
                controls
                preload="metadata"
                poster={c.thumb ? `/api/jobs/${job.id}/media/${c.thumb}` : undefined}
                src={`/api/jobs/${job.id}/media/${c.file}`}
              />
              <b>{c.title}</b>
              <span className="meta">
                {fmt(c.start)}–{fmt(c.end)} · {c.seconds}s · {MB(c.bytes)}
                {c.preset ? ` · ${c.preset}` : ""}
              </span>
              <a
                className="btn btn-white dl"
                href={`/api/jobs/${job.id}/media/${c.file}`}
                download={c.file}
              >
                ⬇️ Unduh klip
              </a>
            </div>
          ))}
        </div>
      )}

      {/* file lain (srt, gambar, audio, video non-klip) */}
      {job.files && job.files.length > 0 && (
        <div className="files">
          {job.files.map((f) => (
            <div className="frow" key={f.file}>
              <span>{FILE_ICO[f.kind] || "📄"}</span>
              <span className="fhandle">{f.file}</span>
              <span className="flabel">{f.label}</span>
              <a className="fdown" href={`/api/jobs/${job.id}/media/${f.file}`} download={f.file} title="Download">⬇️</a>
              {f.link && (
                <a className="fdrive" href={f.link} target="_blank" rel="noreferrer" title="Buka di Google Drive">☁️ Drive</a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* output teks (LLM, transkrip) */}
      {job.texts && job.texts.length > 0 && (
        <div className="texts">
          {job.texts.map((t) => (
            <div className="textblock" key={t.label}>
              <b>{t.label}</b>
              <pre className="textout">{t.body}</pre>
            </div>
          ))}
        </div>
      )}

      {/* log */}
      {job.logs.length > 0 && (
        <details className="logwrap">
          <summary>Log pipeline ({job.logs.length} baris)</summary>
          <pre className="logs">
            {job.logs.slice(-40).map((l, i) => (
              <span key={i}>{l + "\n"}</span>
            ))}
          </pre>
        </details>
      )}

      <p className="mdesc dim">
        Job <code>{job.id}</code> · {job.tool || "klip-ai"} · buka{" "}
        <Link href={`/fitur/${job.tool || "klip-ai"}`}>halaman tool-nya</Link> untuk menjalankan lagi.
      </p>
    </div>
  );
}
