/** ParticleBubbles — (diadaptasi dari remotion-scenes ParticleAnimations/
 *  ParticleBubbles): gelembung naik dengan random berseri (deterministik).
 *  Disesuaikan: tanpa teks "BUBBLES" + latar biru, gelembung putih dengan
 *  tint accent; naik berulang (wrap) supaya latar penuh selama video. */
import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";

export const ParticleBubbles: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const bubbleCount = 32;
  const bubbles = React.useMemo(() => {
    return Array.from({ length: bubbleCount }).map((_, i) => ({
      id: `bubble-${i}`,
      x: random(`b-x-${i}`) * 100,
      delay: random(`b-d-${i}`) * 60,
      speed: random(`b-sp-${i}`) * 1.5 + 0.5,
      size: random(`b-s-${i}`) * 20 + 10,
    }));
  }, []);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {bubbles.map((b) => {
        const startFrame = b.delay;
        if (frame < startFrame) return null;
        const riseProgress = (frame - startFrame) * b.speed;
        // naik berulang: keluar atas → muncul lagi dari bawah
        const y = (((960 - riseProgress) % 1010) + 1010) % 1010 - 25;
        const wobbleX = Math.sin(riseProgress * 0.05 + b.x) * 15;
        return (
          <div key={b.id} style={{
            position: "absolute", left: `${b.x}%`, top: y,
            width: b.size, height: b.size,
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0.2))`,
            borderRadius: "50%", border: `2px solid ${accent}40`,
            transform: `translateX(${wobbleX}px)`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};
