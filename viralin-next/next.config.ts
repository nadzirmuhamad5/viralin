import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev: izinkan akses HMR dari host sandbox (localhost & IP loopback)
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Remotion Next.js guide: renderer/bundler/remotion TIDAK boleh dibundel
  // server (pakai require runtime) — tanpa ini Turbopack mencoba mengompilasi
  // biner esbuild/rspack + studio internal Remotion dan build gagal.
  serverExternalPackages: ["remotion", "@remotion/bundler", "@remotion/renderer"],
  transpilePackages: ["@remotion/player"],
};

export default nextConfig;
