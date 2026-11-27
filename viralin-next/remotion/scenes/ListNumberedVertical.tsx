/** ListNumberedVertical — (diadaptasi dari remotion-scenes ListAnimations/
 *  ListNumberedVertical): nomor besar + isi meluncur dari kiri dengan
 *  stagger. Disesuaikan: bukan scene fullscreen 3 langkah, tapi baris
 *  bernomor untuk satu bullet; nomor pakai font caption theme (Anton). */
import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MOTION_THEME } from "../theme";

export const ListNumberedVertical: React.FC<{
  num: number;
  accent: string;
  children: React.ReactNode;
}> = ({ num, accent, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = React.Children.toArray(children);
  const numProgress = spring({ frame: frame - 25, fps, config: { damping: 15, stiffness: 150 } });
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
      <div style={{
        fontFamily: MOTION_THEME.fonts.caption, fontSize: 80, fontWeight: 400,
        color: accent, lineHeight: 1, flexShrink: 0,
        opacity: numProgress, transform: `translateX(${(1 - numProgress) * -50}px)`,
      }}>
        {String(num).padStart(2, "0")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((child, i) => {
          const progress = spring({ frame: frame - (25 + i * 15), fps, config: { damping: 15, stiffness: 150 } });
          return (
            <div key={i} style={{ transform: `translateX(${(1 - progress) * -50}px)`, opacity: progress }}>
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
};
