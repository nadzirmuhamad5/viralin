"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import type { Job } from "@/lib/store";
import { ICO, MB, fmt } from "@/lib/ui";

const FILE_ICO: Record<string, string> = {
  video: "🎬", image: "🖼️", subtitle: "📝", audio: "🎵", doc: "🗂️",
};

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
                <Download size={14} aria-hidden="true" /> Unduh klip
              </a>
            </div>
          ))}
        </div>
      )}

      {/* file lain (srt, gambar, audio, video non-klip, storyboard) — + link Drive bila job upload ke sana */}
      {job.files && job.files.length > 0 && (
        <div className="files">
          {job.files.map((f) => (
            <div className="fwrap" key={f.file}>
              {f.kind === "image" && (
                <img
                  className="fimg"
                  src={`/api/jobs/${job.id}/media/${f.file}`}
                  alt={f.label}
                  loading="lazy"
                />
              )}
              {f.kind === "doc" && f.file.endsWith(".html") && (
                <iframe
                  className="fboard"
                  src={`/api/jobs/${job.id}/media/${f.file}`}
                  title={f.label}
                  loading="lazy"
                />
              )}
              <div className="frow">
                <a
                  className="fmain"
                  href={`/api/jobs/${job.id}/media/${f.file}`}
                  download={f.file}
                >
                  <span>{FILE_ICO[f.kind] || "📄"}</span>
                  <span className="fhandle">{f.file}</span>
                  <span className="flabel">{f.label}</span>
                  <span className="fdown"><Download size={14} aria-hidden="true" /></span>
                </a>
                {f.link && (
                  <a className="fdrive" href={f.link} target="_blank" rel="noreferrer" title="Buka di Google Drive">
                    ☁️ Drive
                  </a>
                )}
              </div>
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

      {/* log pipeline — auto-terbuka selama job masih berjalan */}
      {job.logs.length > 0 && (
        <details className="logwrap" open={job.status === "run"}>
          <summary>Log pipeline ({job.logs.length} baris){job.status === "run" ? " · berjalan…" : ""}</summary>
          <pre className="logs">
            {job.logs.slice(-60).map((l, i) => (
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
