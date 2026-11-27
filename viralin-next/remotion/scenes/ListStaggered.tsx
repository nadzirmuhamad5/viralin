/** ListStaggered — (diadaptasi dari remotion-scenes ListAnimations/
 *  ListStaggered): anak masuk bergantian kiri/kanan dengan spring +
 *  underline tumbuh. Disesuaikan: bukan scene fullscreen 3 item, tapi
 *  wrapper baris untuk satu bullet; warna dari props (theme). */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MOTION_THEME } from "../theme";

const { ease: EASE } = MOTION_THEME;

export const ListStaggered: React.FC<{
  accent: string;
  children: React.ReactNode;
}> = ({ accent, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = React.Children.toArray(children);
  const underlineW = interpolate(frame, [30, 50], [0, 150], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.out,
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, maxWidth: 480 }}>
      {items.map((child, i) => {
        const delay = i * 20;
        const progress = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });
        const isLeft = i % 2 === 0;
        return (
          <div key={i} style={{
            transform: `translateX(${(1 - progress) * (isLeft ? -60 : 60)}px)`,
            opacity: progress,
          }}>
            {child}
          </div>
        );
      })}
      <div style={{ width: underlineW, height: 2, background: accent, borderRadius: 2 }} />
    </div>
  );
};
