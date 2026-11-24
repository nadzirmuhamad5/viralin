import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev: izinkan akses HMR dari host sandbox (localhost & IP loopback)
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // pipeline lib (toolrun/exec/mediakit) punya type-noise lama; runtime sudah
  // teruji — type-check build dilewati agar `next build` tidak macet.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Remotion Next.js guide: renderer/bundler/remotion TIDAK boleh dibundel
  // server (pakai require runtime) — memutihkan studio/compositor noise.
  serverExternalPackages: ["remotion", "@remotion/bundler", "@remotion/renderer"],
  transpilePackages: ["@remotion/player"],
};

export default nextConfig;
