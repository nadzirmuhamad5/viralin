/** TextKinetic — tipografi kinetik (diadaptasi dari remotion-scenes
 *  TextAnimations/TextKinetic): pop per huruf + bounce + rotate + underline
 *  tumbuh. Disesuaikan: tanpa latar hitam fullscreen, font + warna dari
 *  theme, stagger dipadatkan supaya judul panjang muat di hook. */
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MOTION_THEME } from "../theme";

const { ease: EASE } = MOTION_THEME;

export const TextKinetic: React.FC<{
  text: string;
  accent: string;
  size: number;
  underlineWidth?: number;
}> = ({ text, accent, size, underlineWidth = 240 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // kata dipisah supaya wrap antar kata (bukan tengah kata)
  const words = text.split(/\s+/);
  const chars = text.replace(/\s+/g, "").length;
  // scene: 3 frame/huruf — terlalu lambat buat judul panjang, padatkan ke ~24 frame
  const stagger = Math.min(3, 24 / Math.max(1, chars - 1));
  const underlineW = interpolate(frame, [20, 40], [0, underlineWidth], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.out,
  });
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontSize: size, lineHeight: 1.18, letterSpacing: -0.5,
        textShadow: "0 4px 24px rgba(0,0,0,.45)",
      }}>
        {words.map((w, wi) => {
          const start = words.slice(0, wi).join("").length;
          return (
            <span key={wi} style={{ display: "inline-block", marginRight: size * 0.26, whiteSpace: "nowrap" }}>
              {w.split("").map((ch, k) => {
                const i = start + k;
                const delay = i * stagger;
                const progress = spring({
                  frame: frame - delay, fps,
                  config: { damping: 12, stiffness: 200, mass: 0.8 },
                });
                const bounce = Math.sin((frame - delay) * 0.15) * 5 * progress;
                const rotate = Math.sin((frame - delay) * 0.1 + i) * 3 * progress;
                return (
                  <span key={i} style={{
                    display: "inline-block", color: "#fff",
                    transform: `translateY(${interpolate(progress, [0, 1], [80, 0]) + bounce}px) rotate(${rotate}deg) scale(${progress})`,
                    opacity: progress,
                  }}>{ch}</span>
                );
              })}
            </span>
          );
        })}
      </div>
      <div style={{ height: 8, width: underlineW, borderRadius: 4, background: accent, margin: "14px auto 0" }} />
    </div>
  );
};
