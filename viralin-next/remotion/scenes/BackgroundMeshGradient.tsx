/** BackgroundMeshGradient — (diadaptasi dari remotion-scenes
 *  BackgroundAnimations/BackgroundMeshGradient): 3 blob blur yang
 *  bergerak pelan. Disesuaikan: tanpa teks "MESH" + latar abu, warna
 *  dari palet (bg/bg2/accent + gold theme); opacity dijaga supaya teks
 *  tetap terbaca. */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { MOTION_THEME } from "../theme";

const GOLD = MOTION_THEME.colors.gold;

export const BackgroundMeshGradient: React.FC<{
  accent: string;
  bg: string;
  bg2: string;
}> = ({ accent, bg, bg2 }) => {
  const frame = useCurrentFrame();
  const blob1X = 30 + Math.sin(frame * 0.02) * 20;
  const blob1Y = 30 + Math.cos(frame * 0.03) * 15;
  const blob2X = 70 + Math.cos(frame * 0.025) * 15;
  const blob2Y = 60 + Math.sin(frame * 0.02) * 20;
  const blob3X = 50 + Math.sin(frame * 0.015) * 25;
  const blob3Y = 80 + Math.cos(frame * 0.02) * 10;
  return (
    <AbsoluteFill style={{
      overflow: "hidden",
      background: `linear-gradient(160deg, ${bg} 0%, ${bg2} 100%)`,
    }}>
      <div style={{ position: "absolute", left: `${blob1X}%`, top: `${blob1Y}%`, width: "60%", height: "60%", background: accent, borderRadius: "50%", filter: "blur(100px)", opacity: 0.35, transform: "translate(-50%, -50%)" }} />
      <div style={{ position: "absolute", left: `${blob2X}%`, top: `${blob2Y}%`, width: "50%", height: "50%", background: accent, borderRadius: "50%", filter: "blur(100px)", opacity: 0.3, transform: "translate(-50%, -50%)" }} />
      <div style={{ position: "absolute", left: `${blob3X}%`, top: `${blob3Y}%`, width: "40%", height: "40%", background: GOLD, borderRadius: "50%", filter: "blur(80px)", opacity: 0.3, transform: "translate(-50%, -50%)" }} />
    </AbsoluteFill>
  );
};
