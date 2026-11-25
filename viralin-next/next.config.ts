import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev: izinkan akses HMR dari host sandbox (localhost & IP loopback)
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // type-check build DI-AKTIFKAN kembali — seluruh lib kini lolos tsc --noEmit
  // (dulu dimatikan karena type-noise; sudah dibersihkan saat refactor efisiensi).
};

export default nextConfig;
