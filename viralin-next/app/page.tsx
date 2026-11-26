"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Job } from "@/lib/store";
import { ICO, fmt } from "@/lib/ui";
import { PRESETS, DEFAULT_PRESET } from "@/lib/captions";
import { TOOL_BY_ID } from "@/lib/tools";
import { HARGA, FAQ, CARA_KERJA } from "@/lib/site";
import { useJobPolling } from "@/lib/use-job-polling";
import JobPanel from "@/components/JobPanel";

/** 8 fitur unggulan yang dipromosikan di landing — sisanya di /fitur. */
const UNGGULAN = [
  "klip-ai",
  "konten-tempel",
  "highlight-bola",
  "transcript",
  "ai-image",
  "dubbing",
  "title-optimizer",
  "music-gen",
];

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

  /** Job yang di-watch selesai (done/fail) → refresh riwayat, sama seperti versi lama. */
  const onJobFinished = useCallback(
    (_job: Job) => {
      void refreshList();
    },
    [refreshList]
  );

  const { job: polledJob } = useJobPolling(watchId, {
    onDone: onJobFinished,
    onFail: onJobFinished,
  });

  // Tiap hasil poll → panel aktif (pengganti setActive(j) per tick di watch() lama).
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

  const nLive = 17;
  // Job done berklip → promo showcase (memoized; hanya berubah saat riwayat berubah).
  const showcase = useMemo(() => {
    const arr: Array<{ job: Job; idx: number }> = [];
    for (const j of jobs) {
      if (j.status === "done" && j.clips.length > 0) arr.push({ job: j, idx: 0 });
    }
    return arr;
  }, [jobs]);

  return (
    <>
      {/* ── hero + input raksasa (gaya klipers.pro) ── */}
      <header className="hero" id="studio">
        <p className="eyebrow">Selamat {greet}, Kreator 👋</p>
        <h1>Ubah Video Panjang Jadi Klip Viral — Otomatis</h1>
        <p className="hero-sub">
          Deteksi momen terbaik, potong 9:16, caption karaoke gaya klipers — plus 19 tool
          AI lain. Pipeline nyata berjalan di server ini: unduh → transkrip → render.
        </p>
        <div className="statrow">
          <span className="stat">
            <b>20</b> tool AI
          </span>
          <span className="stat">
            <b>{nLive}</b> jalan gratis
          </span>
          <span className="stat">
            <b>0</b> login
          </span>
          <span className="stat">
            <b>30</b> preset caption
          </span>
        </div>
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
          Video lebih dari 25 menit otomatis dipecah per bagian — AI cari momen di
          tiap bagian · YouTube/TikTok bisa menolak IP data center (bot
          check) · URL file .mp4 langsung selalu jalan
        </p>
        {err && (
          <div className="ask" style={{ marginTop: 14 }}>
            <div className="err">{err}</div>
          </div>
        )}
        {active && (
          <div className="wrap" style={{ textAlign: "left" }}>
            <JobPanel job={active} />
          </div>
        )}
      </header>

      {/* ── hasil nyata (hanya bila ada job selesai) ── */}
      {showcase.length > 0 && (
        <section className="wrap sec">
          <h2 className="sec-h">Dibuat dengan Viralin</h2>
          <p className="sec-sub">
            Klip di bawah dirender sungguhan oleh pipeline server ini — bukan placeholder.
            Klik untuk putar.
          </p>
          <div className="hscroll">
            {showcase.slice(0, 6).map(({ job, idx }) => (
              <div className="clip" key={`${job.id}-${job.clips[idx].file}`}>
                <video
                  controls
                  preload="metadata"
                  poster={`/api/jobs/${job.id}/media/${job.clips[idx].thumb}`}
                  src={`/api/jobs/${job.id}/media/${job.clips[idx].file}`}
                />
                <b>{job.clips[idx].title}</b>
                <span className="meta">
                  {fmt(job.clips[idx].start)}–{fmt(job.clips[idx].end)} ·{" "}
                  {job.clips[idx].seconds}s
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── fitur unggulan → halaman tool ── */}
      <section className="wrap sec" id="fitur">
        <h2 className="sec-h">Fitur Unggulan</h2>
        <p className="sec-sub">
          Klik kartu untuk buka halaman tool-nya — isi form, jalankan, unduh hasil.
        </p>
        <div className="toolgrid">
          {UNGGULAN.map((id) => {
            const t = TOOL_BY_ID[id];
            return (
              <Link className="tcard" key={id} href={`/fitur/${id}`}>
                <span className="tline">
                  <span className="tic">{t.icon}</span>
                  <b>{t.name}</b>
                  {t.badge && (
                    <span className={`badge ${t.badge === "PRO" ? "pro" : "new"}`}>
                      {t.badge}
                    </span>
                  )}
                </span>
                <span className="tdesc">{t.desc}</span>
              </Link>
            );
          })}
        </div>
        <p className="linkmore">
          →{" "}
          <Link href="/fitur">
            Lihat semua 20 fitur (termasuk Transkrip, Merge, Brand Kit, dsb.)
          </Link>
        </p>
      </section>

      {/* ── cara kerja ── */}
      <section className="wrap sec">
        <h2 className="sec-h">Cara Kerja</h2>
        <p className="sec-sub">Tiga langkah — tanpa instal, tanpa akun.</p>
        <div className="steps">
          {CARA_KERJA.map(([n, judul, isi]) => (
            <div className="step" key={n}>
              <span className="stepn">{n}</span>
              <b>{judul}</b>
              <p>{isi}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── harga (angka asli klipers.pro, di-capture 18 Nov 2026) ── */}
      <section className="wrap sec" id="harga">
        <h2 className="sec-h">Harga Simpel &amp; Transparan</h2>
        <p className="sec-sub">
          Angka di-capture langsung dari klipers.pro hari ini — demo edukasi, bukan tagihan.
          Di demo ini semua tier dibuka gratis.
        </p>
        <div className="plans">
          {HARGA.map((p) => (
            <div className={`plan${p.hot ? " hot" : ""}`} key={p.nama}>
              {p.hot && <span className="hot-tag">PALING LARIS</span>}
              <h3>{p.nama}</h3>
              <span className="tag">{p.tag}</span>
              <span className="price-old">{p.old}</span>
              <span className="price">
                {p.now}
                <span className="per">{p.per}</span>
              </span>
              <span className="save">{p.save}</span>
              <ul>
                {p.fitur.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link className="btn" href="/harga">
                LIHAT DETAIL
              </Link>
            </div>
          ))}
        </div>
        <div className="paynote">
          <span className="paychip">💳 QRIS</span>
          <span className="paychip">🏦 Transfer</span>
          <span className="paychip">📱 e-Wallet</span>
          <span>
            · harga &amp; tier asli klipers.pro ·{" "}
            <Link className="link-in" href="/harga">
              perbandingan lengkap →
            </Link>
          </span>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="wrap sec faq" id="faq">
        <h2 className="sec-h">Pertanyaan yang Sering Diajukan</h2>
        <p className="sec-sub">Pertanyaan asli dari klipers.pro — jawaban versi demo Viralin.</p>
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <div className="ans">{a}</div>
          </details>
        ))}
      </section>

      {/* ── CTA band ── */}
      <section className="wrap sec">
        <div className="ctaband">
          <h2>Siap bikin klip pertamamu?</h2>
          <p>Gratis, tanpa daftar. Tempel link video atau mulai dari salah satu tool.</p>
          <div className="ctarow">
            <Link className="btn btn-white" href="/fitur/klip-ai">
              Coba Analisis AI
            </Link>
            <Link className="btn" href="/fitur/konten-tempel">
              Bikin Video Faceless
            </Link>
          </div>
        </div>
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
