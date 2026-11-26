import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev: izinkan akses HMR dari host sandbox (localhost & IP loopback)
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Remotion Next.js guide: renderer/bundler/remotion TIDAK boleh dibundel
  // server (pakai require runtime) — tanpa ini Turbopack mencoba mengompilasi
  // biner esbuild/rspack + studio internal Remotion dan build gagal.
  serverExternalPackages: ["remotion", "@remotion/bundler", "@remotion/renderer"],
  transpilePackages: ["@remotion/player"],
  // Deploy frontend di Vercel + mesin render di worker lain: set env WORKER_URL
  // di Vercel (mis. https://worker.domain) → semua /api/* di-proxy ke worker
  // (history job, submit job, upload, unduh media ikut). Tanpa env ini, API
  // lokal dipakai seperti biasa (sandbox/dev).
  async rewrites() {
    const worker = process.env.WORKER_URL;
    if (!worker) return [];
    return [{ source: "/api/:path*", destination: `${worker.replace(/\/$/, "")}/api/:path*` }];
  },
};

export default nextConfig;
