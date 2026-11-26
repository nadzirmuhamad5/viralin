"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Job } from "@/lib/store";
import { ICO } from "@/lib/ui";
import { PRESETS, DEFAULT_PRESET } from "@/lib/captions";
import { TOOLS } from "@/lib/tools";
import { useJobPolling } from "@/lib/use-job-polling";
import JobPanel from "@/components/JobPanel";

const LIVE = TOOLS.filter((t) => t.live);

/** Beranda sederhana: hero + input Analisis AI, tool cepat, riwayat job. */
export default function Home() {
  const [url, setUrl] = useState("");
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [active, setActive] = useState<Job | null>(null);
  const [watchId, setWatchId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [greet, setGreet] = useState("Pagi");

  useEffect(() => {
    const h = new Date().getHours();
    setGreet(h < 4 ? "Malam" : h < 11 ? "Pagi" : h < 15 ? "Siang" : h < 18.5 ? "Sore" : "Malam");
  }, []);

  const refreshList = useCallback(async () => {
    try {
      const r = await fetch("/api/jobs", { cache: "no-store" });
      const j = await r.json();
      setJobs(j.jobs || []);
    } catch {
      /* dev server restart — abaikan */
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  /** Job yang di-watch selesai (done/fail) → refresh riwayat. */
  const onJobFinished = useCallback(() => {
    void refreshList();
  }, [refreshList]);

  const { job: polledJob } = useJobPolling(watchId, {
    onDone: onJobFinished,
    onFail: onJobFinished,
  });

  useEffect(() => {
    if (polledJob) setActive(polledJob);
  }, [polledJob]);

  const submit = async () => {
    setErr("");
    if (!url.trim()) {
      setErr("Masukkan URL dulu — contoh: http://127.0.0.1:8080/e2e-ujian.mp4");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), preset }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "gagal membuat job");
      setActive(j);
      setWatchId(j.id);
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* ── hero + input video (Analisis AI) ── */}
      <header className="hero" id="studio">
        <p className="eyebrow">Selamat {greet}, Kreator 👋</p>
        <h1>Ubah Video Panjang Jadi Klip Viral</h1>
        <p className="hero-sub">
          Tempel link video — AI cari momen terbaik, potong 9:16, caption karaoke. Tool lain ada
          di sidebar.
        </p>
        <div className="ask">
          <input
            type="text"
            placeholder="Tempel link video (contoh uji: http://127.0.0.1:8080/e2e-ujian.mp4)…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
          />
          <div className="presets">
            <span className="presets-label">Gaya caption (asli klipers.pro):</span>
            <div className="presets-row">
              {Object.values(PRESETS).map((p) => (
                <button
                  key={p.id}
                  className={`chip${preset === p.id ? " on" : ""}`}
                  onClick={() => setPreset(p.id)}
                  title={`${p.name} · font ${p.fontFile.replace(".ttf", "")} · highlight ${p.highlightColor}`}
                >
                  <span className="dot" style={{ background: p.highlightColor }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div className="askrow">
            <span className="techpill">🎙️ whisper small · id</span>
            <span className="techpill dim">⚡ maks 3 klip · pecah otomatis per 25 mnt</span>
            <button className="send" onClick={submit} disabled={busy} aria-label="Proses">
              {busy ? "⏳" : "🚀"}
            </button>
          </div>
        </div>
        <p className="hintrow">
          YouTube/TikTok bisa menolak IP data center (bot check) · URL file .mp4 langsung selalu
          jalan
        </p>
        {err && (
          <div className="ask" style={{ marginTop: 14 }}>
            <div className="err">{err}</div>
          </div>
        )}
        {active && (
          <div style={{ textAlign: "left" }}>
            <JobPanel job={active} />
          </div>
        )}
      </header>

      {/* ── tool cepat ── */}
      <section className="wrap sec">
        <h2 className="sec-h">Tool Cepat</h2>
        <p className="sec-sub">
          {LIVE.length} tool aktif — klik kartu untuk buka halaman tool-nya, isi form, jalankan.
        </p>
        <div className="toolgrid">
          {LIVE.map((t) => (
            <Link className="tcard" key={t.id} href={`/fitur/${t.id}`}>
              <span className="tline">
                <span className="tic">{t.icon}</span>
                <b>{t.name}</b>
                {t.badge && (
                  <span className={`badge ${t.badge === "PRO" ? "pro" : "new"}`}>{t.badge}</span>
                )}
              </span>
              <span className="tdesc">{t.desc}</span>
            </Link>
          ))}
        </div>
        <p className="linkmore">
          → <Link href="/fitur">Lihat semua fitur</Link>
        </p>
      </section>

      {/* ── riwayat job ── */}
      {jobs.length > 0 && (
        <section className="wrap sec">
          <h2 className="sec-h">Riwayat job</h2>
          <div>
            {jobs.slice(0, 24).map((j) => (
              <div
                className="jrow"
                key={j.id}
                onClick={() => {
                  setErr("");
                  fetch(`/api/jobs/${j.id}`, { cache: "no-store" })
                    .then((r) => r.json())
                    .then((x: Job) => {
                      setActive(x);
                      if (x.status === "run" || x.status === "queued") setWatchId(x.id);
                      else setWatchId(null); // sudah selesai — matikan watcher lama (bila ada)
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    });
                }}
              >
                <span>{ICO[j.status] || "⚙️"}</span>
                <span className="ttl">{j.title}</span>
                <span className="st">
                  {j.tool || "klip-ai"} · {j.clips.length} klip ·{" "}
                  {new Date(j.createdAt).toLocaleTimeString("id-ID")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
