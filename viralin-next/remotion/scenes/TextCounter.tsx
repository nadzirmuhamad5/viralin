/** TextCounter — (diadaptasi dari remotion-scenes TextAnimations/
 *  TextCounter): angka menghitung naik + ring progres. Disesuaikan:
 *  bukan scene fullscreen, tapi ikon 175px di dalam BulletScene; angka
 *  + ring pakai warna tema; format ribuan ala Indonesia. */
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MOTION_THEME } from "../theme";

const { ease: EASE, spring: SPRING } = MOTION_THEME;

export const TextCounter: React.FC<{
  text: string;
  accent: string;
  chip: string;
}> = ({ text, accent, chip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: SPRING.bouncy });
  const mm = text.match(/(\d+([.,]\d+)?)/);
  if (!mm) return null;
  const target = parseFloat(mm[1].replace(",", "."));
  // hitung naik (scene): lerp frame 5→44, format ribuan
  const progress = interpolate(frame, [5, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE.out,
  });
  const v = target * progress;
  const show =
    target >= 100
      ? Math.floor(v).toLocaleString("id-ID")
      : (Math.round(v * 10) / 10).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const unit = /%/.test(text) ? "%" : "";
  const C = 2 * Math.PI * 56;
  return (
    <div style={{ position: "relative", width: 175, height: 175, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg viewBox="-70 -70 140 140" width={175} height={175} style={{ position: "absolute", inset: 0 }}>
        <circle r={56} fill={chip} stroke={accent} strokeWidth={9} strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90)" strokeLinecap="round" opacity={0.95} />
      </svg>
      <div style={{
        fontSize: target >= 1000 ? 40 : 56, fontWeight: 900, color: "#fff",
        fontVariantNumeric: "tabular-nums", transform: `scale(${pop})`,
      }}>
        {show}{unit}
      </div>
    </div>
  );
};
