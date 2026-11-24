/** Komposisi Remotion "Motion Studio" — 9:16, 30fps.
 *  Hook animasi (whoosh) → bullet reveal bertahap (pop) → CTA pulse (ding).
 *  Dipakai bersama: <Player> di browser (live preview) DAN renderMedia di server. */
import React from "react";
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  MOTION_BULLET_LEN,
  MOTION_BULLET_START,
  MOTION_CTA_START,
  PALETTES,
  motionBullets,
  motionDurationFrames,
  type MotionStudioProps,
} from "../lib/motion";

/** Muat font Montserrat ExtraBold via staticFile (sama-origin dari publicDir bundle
 *  / public Next di Player). Module-scope + delayRender — pola resmi Remotion. */
if (typeof document !== "undefined" && !document.fonts.check('20px "Montserrat XB"')) {
  const handle = delayRender("montserrat-eb");
  new FontFace("Montserrat XB", `url(${staticFile("fonts/Montserrat-ExtraBold.ttf")})`)
    .load()
    .then((loaded) => { document.fonts.add(loaded); continueRender(handle); })
    .catch(() => continueRender(handle));
}

const Judul: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const size = text.length > 26 ? 38 : text.length > 16 ? 48 : 58;
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 140, mass: 0.6 } });
  const y = interpolate(s, [0, 1], [90, 0]);
  const scaleX = interpolate(s, [0, 1], [0.6, 1]);
  const lineW = interpolate(frame, [6, 30], [0, 240], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  return (
    <div style={{ transform: `translateY(${y}px) scale(${scaleX})`, opacity: Math.min(s * 2, 1), textAlign: "center" }}>
      <div style={{ fontSize: size, lineHeight: 1.15, color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,.45)", whiteSpace: "pre-wrap" }}>
        {text}
      </div>
      <div style={{ marginTop: 14, height: 8, width: lineW, borderRadius: 4, background: accent, margin: "14px auto 0" }} />
    </div>
  );
};

const Bullet: React.FC<{ text: string; idx: number; accent: string; chip: string }> = ({ text, idx, accent, chip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 150, mass: 0.5 } });
  const x = interpolate(s, [0, 1], [-90, 0]);
  return (
    <div style={{ transform: `translateX(${x}px)`, opacity: Math.min(s * 1.6, 1), display: "flex", alignItems: "center", gap: 18, maxWidth: 470 }}>
      <div style={{ flexShrink: 0, width: 64, height: 64, borderRadius: 32, background: accent, color: "#0b0b0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900, boxShadow: `0 0 24px ${accent}66` }}>
        {idx + 1}
      </div>
      <div style={{ background: `${chip}cc`, borderRadius: 18, padding: "16px 22px", fontSize: 32, lineHeight: 1.25, color: "#fff", fontWeight: 700 }}>
        {text}
      </div>
    </div>
  );
};

const Cta: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 10, stiffness: 160, mass: 0.5 } });
  const pulse = 1 + Math.sin(frame / 4) * 0.035;
  const size = text.length > 22 ? 36 : text.length > 14 ? 42 : 50;
  return (
    <div style={{ transform: `scale(${s * pulse})`, opacity: Math.min(s * 2, 1) }}>
      <div style={{ background: accent, borderRadius: 26, padding: "26px 40px", fontSize: size, fontWeight: 900, color: "#0b0b0b", letterSpacing: 1, boxShadow: `0 0 60px ${accent}88`, whiteSpace: "pre-wrap", textAlign: "center" }}>
        {text}
      </div>
    </div>
  );
};

export const MotionStudio: React.FC<MotionStudioProps> = ({
  judul, bullets, cta, warna, sfx,
}) => {
  const frame = useCurrentFrame();
  const dur = motionDurationFrames({ judul, bullets, cta, warna, sfx });
  const pal = PALETTES[warna] || PALETTES.green;
  const items = motionBullets({ judul, bullets, cta, warna, sfx });
  const ctaStart = MOTION_CTA_START({ judul, bullets, cta, warna, sfx });

  // Background gradient bergerak pelan + blob aksen
  const drift = interpolate(frame, [0, dur], [0, 1]);
  const bgStyle: React.CSSProperties = {
    background: [
      `radial-gradient(circle at ${28 + drift * 14}% 22%, ${pal.accent}2e, transparent 52%)`,
      `radial-gradient(circle at ${72 - drift * 12}% 78%, ${pal.accent}24, transparent 48%)`,
      `linear-gradient(160deg, ${pal.bg} 0%, ${pal.bg2} 100%)`,
    ].join(","),
  };

  // Progress bar global di bawah
  const prog = Math.min(frame / Math.max(dur - 1, 1), 1);

  return (
    <AbsoluteFill style={{ ...bgStyle, fontFamily: '"Montserrat XB", "Montserrat ExtraBold", sans-serif' }}>
      {/* ---- SFX sinkron (dilewati bila sfx=false) — asset sama-origin via staticFile ---- */}
      {sfx ? (
        <>
          <Sequence from={0}>
            <Audio src={staticFile("sfx/whoosh.wav")} volume={0.9} />
          </Sequence>
          {items.map((_, i) => (
            <Sequence key={`pop-${i}`} from={MOTION_BULLET_START + i * MOTION_BULLET_LEN}>
              <Audio src={staticFile("sfx/pop.wav")} volume={0.8} />
            </Sequence>
          ))}
          <Sequence from={ctaStart}>
            <Audio src={staticFile("sfx/ding.wav")} volume={0.9} />
          </Sequence>
        </>
      ) : null}

      {/* ---- Scene 1: HOOK ---- */}
      <Sequence from={0} durationInFrames={MOTION_BULLET_START}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 40 }}>
          <Judul text={judul || "VIRALIN"} accent={pal.accent} />
        </AbsoluteFill>
      </Sequence>

      {/* ---- Scene 2: BULLETS ---- */}
      {items.map((text, i) => (
        <Sequence key={`b-${i}`} from={MOTION_BULLET_START + i * MOTION_BULLET_LEN} durationInFrames={MOTION_BULLET_LEN}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 40 }}>
            <Bullet text={text} idx={i} accent={pal.accent} chip={pal.chip} />
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* ---- Scene 3: CTA ---- */}
      <Sequence from={ctaStart} durationInFrames={Math.max(dur - ctaStart, 1)}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 40 }}>
          <Cta text={cta || "FOLLOW SEKARANG"} accent={pal.accent} />
        </AbsoluteFill>
      </Sequence>

      {/* ---- Progress bar ---- */}
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 6, width: `${prog * 100}%`, background: pal.accent, opacity: 0.85 }} />
    </AbsoluteFill>
  );
};
