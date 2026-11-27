/** Lapisan 5-stack remotion-motion-graphics (motion-patterns §5-7):
 *  background mesh → aset → grafis/teks → color grade → grain + vignette.
 *  Grade di atas konten, grain + vignette paling atas. Tanpa lapisan ini
 *  scene terlihat flat — itu yang diperbaiki di MotionStudio. */
import React from "react";
import { AbsoluteFill } from "remotion";

/** Color grade: satukan aset yang beda sumber (ilustrasi AI + ikon + teks)
 *  dalam satu look. Opacity 0.18 untuk tema gelap (semua tema Viralin gelap). */
export const Grade: React.FC<{ accent: string }> = ({ accent }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill
      style={{ backgroundColor: accent, mixBlendMode: "soft-light", opacity: 0.18 }}
    />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(0,0,0,0.10), transparent 28%, transparent 72%, rgba(0,0,0,0.20))",
      }}
    />
  </AbsoluteFill>
);

/** Grain prosedural, tanpa file aset. Flicker film halus per frame. */
export const Grain: React.FC = () => {
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backgroundImage: noise,
        backgroundSize: "220px",
        opacity: 0.05,
        mixBlendMode: "overlay",
      }}
    />
  );
};

/** Vignette — lapisan paling atas. */
export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background:
        "radial-gradient(ellipse at center, transparent 56%, rgba(0,0,0,0.22) 100%)",
    }}
  />
);
