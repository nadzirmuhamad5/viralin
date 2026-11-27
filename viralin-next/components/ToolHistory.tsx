"use client";

import { useCallback, useEffect, useState } from "react";
import type { Job } from "@/lib/store";
import { ICO } from "@/lib/ui";
import { useJobPolling } from "@/lib/use-job-polling";
import JobPanel from "./JobPanel";

/** Riwayat job SATU tool — tampil di halaman /fitur/[slug] di bawah form.
 *  Log pipeline & hasil ikut JobPanel saat baris dipilih (bukan cuma di Beranda). */
export default function ToolHistory({ toolId }: { toolId: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<string | null>(null);

  const refreshList = useCallback(() => {
    fetch("/api/jobs", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setJobs((j.jobs || []).filter((x: Job) => (x.tool || "klip-ai") === toolId));
      })
      .catch(() => {
        /* server restart — abaikan */
      });
  }, [toolId]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const onFinished = useCallback(() => {
    refreshList();
  }, [refreshList]);

  const { job: polledJob } = useJobPolling(watchId, { onDone: onFinished, onFail: onFinished });

  if (!jobs.length) return null;

  // job terpilih (fallback: job terbaru tool ini / hasil poll berjalan)
  const active: Job | undefined =
    jobs.find((x) => x.id === picked) ?? polledJob ?? jobs[0];

  const pick = (id: string) => {
    const j = jobs.find((x) => x.id === id);
    setPicked(id);
    if (j && (j.status === "run" || j.status === "queued")) setWatchId(j.id);
    else setWatchId(null);
  };

  return (
    <section className="wrap sec" style={{ marginTop: 8 }}>
      <h2 className="sec-h">Riwayat job — {toolId}</h2>
      <div>
        {jobs.slice(0, 10).map((j) => (
          <div className="jrow" key={j.id} onClick={() => pick(j.id)}>
            <span>{ICO[j.status] || "⚙️"}</span>
            <span className="ttl">{j.title || j.url}</span>
            <span className="st">
              {j.clips.length} video ·{" "}
              {new Date(j.createdAt).toLocaleTimeString("id-ID")}
            </span>
          </div>
        ))}
      </div>
      {active && (
        <div style={{ marginTop: 12 }}>
          <JobPanel job={active} />
        </div>
      )}
    </section>
  );
}
