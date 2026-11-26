"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { TOOLS } from "@/lib/tools";

const LIVE = TOOLS.filter((t) => t.live);

/** Kerangka aplikasi: sidebar navigasi (desktop) + topbar burger (mobile).
 *  Menggantikan sitehead topbar lama — semua halaman berbagi satu shell. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const close = () => setOpen(false);

  const nl = (href: string, icon: string, label: string) => (
    <Link key={href} href={href} onClick={close} className={`navlink${path === href ? " on" : ""}`}>
      <span className="ic">{icon}</span>
      <span>{label}</span>
    </Link>
  );

  // CSS Lab (/lab) menampilkan UI penuhnya sendiri — header, hero, dan footer
  // sendiri. Shell sidebar disembunyikan agar lab tampil imersif full-viewport.
  if (path?.startsWith("/lab")) return <>{children}</>;

  return (
    <div className="shell">
      <aside className={`side${open ? " open" : ""}`}>
        <Link className="side-brand" href="/" onClick={close}>
          <span className="logo-ico">⚡</span> Viralin
        </Link>
        <div className="side-group">Menu</div>
        {nl("/", "🏠", "Beranda")}
        {nl("/fitur", "🧰", "Semua Fitur")}
        {nl("/lab", "🎨", "CSS Lab")}
        <div className="side-group">Tools</div>
        {LIVE.map((t) => nl(`/fitur/${t.id}`, t.icon, t.name))}
        <div className="side-group">Info</div>
        {nl("/harga", "💳", "Harga")}
        {nl("/tentang", "ℹ️", "Tentang")}
        {nl("/kontak", "✉️", "Kontak")}
        <div className="side-foot">Demo edukasi — bukan produk komersial.</div>
      </aside>
      {open && <div className="scrim open" onClick={close} />}
      <div className="maincol">
        <div className="topbar">
          <button className="burger" onClick={() => setOpen(!open)} aria-label="Buka menu">
            ☰
          </button>
          <span className="tb-brand">
            <span className="logo-ico">⚡</span> Viralin
          </span>
        </div>
        <main>{children}</main>
        <footer className="sitefoot">
          <p>
            <b>Viralin (demo edukasi)</b> — tiruan alur klipers.pro dengan stack gratis: yt-dlp ·
            faster-whisper · ffmpeg · edge-tts · GLM (z-ai). Angka harga di-capture dari
            klipers.pro (18 Nov 2026) sebagai perbandingan — bukan tagihan sungguhan.
          </p>
          <p className="dim">
            Jalankan sendiri: lihat README di repo. YouTube/TikTok dari IP data center butuh
            cookies / proxy residential.
          </p>
        </footer>
      </div>
    </div>
  );
}
