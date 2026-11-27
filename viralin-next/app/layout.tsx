import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Viralin — Klip Viral Otomatis (Demo)",
  description:
    "Demo edukasi: pipeline nyata yt-dlp + faster-whisper + ffmpeg untuk klip 9:16 ber-caption karaoke, plus tool AI. Tanpa login.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
