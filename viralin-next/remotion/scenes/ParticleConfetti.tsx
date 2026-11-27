/** ParticleConfetti — (diadaptasi dari remotion-scenes ParticleAnimations/
 *  ParticleConfetti): confetti jatuh dengan random berseri (deterministik).
 *  Disesuaikan: tanpa teks "CELEBRATE!" + latar abu, warna dari theme;
 *  tersebar di seluruh tinggi sejak awal (CTA cuma ~90 frame) + jatuh
 *  berulang. */
import React from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";
import { MOTION_THEME } from "../theme";

const { gold: GOLD, rose: ROSE } = MOTION_THEME.colors;

export const ParticleConfetti: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const colors = [GOLD, ROSE, accent, "#fff"];
  const confettiCount = 60;
  const confetti = React.useMemo(() => {
    return Array.from({ length: confettiCount }).map((_, i) => ({
      id: `confetti-${i}`,
      x: random(`c-x-${i}`) * 100,
      delay: random(`c-d-${i}`) * 30,
      speed: random(`c-sp-${i}`) * 3 + 2,
      rotation: random(`c-r-${i}`) * 360,
      rotationSpeed: (random(`c-rs-${i}`) - 0.5) * 20,
      size: random(`c-s-${i}`) * 15 + 8,
      color: colors[i % colors.length],
      type: Math.floor(random(`c-t-${i}`) * 3),
      offset: random(`c-o-${i}`) * (height + 100),
    }));
  }, [accent, height]);
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      {confetti.map((c) => {
        const startFrame = c.delay;
        if (frame < startFrame) return null;
        const fallProgress = (frame - startFrame) * c.speed;
        const y = (((-50 + fallProgress + c.offset) % (height + 100)) + (height + 100)) % (height + 100) - 50;
        const wobbleX = Math.sin(fallProgress * 0.1 + c.x) * 30;
        const rotation = c.rotation + (frame - startFrame) * c.rotationSpeed;
        return (
          <div key={c.id} style={{
            position: "absolute", left: `${c.x}%`, top: y,
            width: c.type === 0 ? c.size : c.size * 0.5,
            height: c.type === 0 ? c.size * 0.5 : c.size,
            background: c.color,
            borderRadius: c.type === 2 ? "50%" : 2,
            transform: `translateX(${wobbleX}px) rotate(${rotation}deg)`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};
