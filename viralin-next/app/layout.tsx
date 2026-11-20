import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Viralin — Klip Viral Otomatis (Demo)",
  description:
    "Demo edukasi: pipeline nyata yt-dlp + faster-whisper + ffmpeg untuk klip 9:16 ber-caption karaoke, plus 20 tool AI. Tanpa login.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div className="sitehead">
          <Link className="logo" href="/">
            <span className="logo-ico">⚡</span> Viralin
          </Link>
          <nav className="nav">
            <Link href="/fitur">Fitur</Link>
            <Link href="/harga">Harga</Link>
            <Link href="/tentang">Tentang</Link>
            <Link href="/kontak">Kontak</Link>
          </nav>
          <Link className="btn btn-white head-cta" href="/#studio">
            Coba Sekarang
          </Link>
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
      </body>
    </html>
  );
}
