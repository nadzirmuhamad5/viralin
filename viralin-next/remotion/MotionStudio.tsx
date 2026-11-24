/** Komposisi Remotion "Motion Studio" — 9:16 540x960, 30fps.
 *  Animasi SESUAI ISI: tiap bullet dapat arketipe visual sendiri (money/phone/check/
 *  heart/fire/alert/clock/chat/rocket/counter/slide) — ikon SVG beranimasi + motion
 *  terus-menerus (partikel, float, pulse), bukan sekadar slide masuk.
 *  Dipakai bersama: <Player> di browser (live preview) DAN renderMedia di server. */
import React from "react";
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  MOTION_BULLET_LEN,
  MOTION_BULLET_START,
  MOTION_CTA_START,
  PALETTES,
  motionDurationFrames,
  motionScenes,
  type AnimId,
  type MotionStudioProps,
  type WarnaId,
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

/** pseudo-random deterministik (partikel dsb. stabil antar render). */
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const GOLD = "#fbbf24", GOLD_D = "#b45309", ROSE = "#fb7185", RED = "#ef4444";

/* ═══════════════ IKON BERANIMASI PER ARKETIPE ═══════════════ */

const HeartPath: React.FC<{ s: number; fill: string; op?: number }> = ({ s, fill, op = 1 }) => (
  <g transform={`scale(${s})`} opacity={op}>
    <path d="M0 6 C0 -2 -11 -3 -11 5 C-11 12 0 19 0 19 C0 19 11 12 11 5 C11 -3 0 -2 0 6 Z" fill={fill} />
  </g>
);

const Coin: React.FC<{ x: number; y: number; r: number; op: number }> = ({ x, y, r, op }) => (
  <g transform={`translate(${x} ${y})`} opacity={op}>
    <circle r={r} fill={GOLD} stroke={GOLD_D} strokeWidth={Math.max(2, r / 7)} />
    <text textAnchor="middle" dominantBaseline="central" fontSize={r * 0.9} fontWeight={900} fill={GOLD_D}>Rp</text>
  </g>
);

const SceneIcon: React.FC<{ a: AnimId; text: string; accent: string; chip: string }> = ({ a, text, accent, chip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 10, stiffness: 150, mass: 0.6 } });
  const idle = 1 + Math.sin(frame / 9) * 0.045;

  const wrap = (children: React.ReactNode, extra?: React.CSSProperties): React.ReactNode => (
    <svg viewBox="-140 -140 280 280" width={175} height={175} style={{ ...extra }}>{children}</svg>
  );

  switch (a) {
    case "money": {
      return wrap(<>
        {[0, 1, 2, 3].map((k) => {
          const y = ((frame * 3.2 + k * 55) % 240) - 120;
          const x = [-108, -52, 48, 104][k] + Math.sin(frame / 10 + k) * 6;
          const op = Math.min((y + 120) / 26, (120 - y) / 26, 1);
          return <Coin key={k} x={x} y={y} r={15} op={Math.max(op, 0)} />;
        })}
        <g transform={`scale(${pop * idle}) rotate(${Math.sin(frame / 14) * 10})`}>
          <Coin x={0} y={0} r={52} op={1} />
        </g>
      </>);
    }
    case "phone": {
      const bar = (k: number) => 52 + 30 * (0.5 + 0.5 * Math.sin(frame / 7 + k * 2));
      const heartS = 1 + 0.4 * Math.max(0, Math.sin(((frame % 26) / 26) * Math.PI * 2));
      return wrap(
        <g transform={`scale(${pop}) translate(0 ${Math.sin(frame / 10) * 5})`}>
          <rect x={-52} y={-92} width={104} height={184} rx={20} fill={chip} stroke="#fff" strokeWidth={5} />
          <rect x={-20} y={-84} width={40} height={7} rx={3.5} fill="#fff" opacity={0.85} />
          {[0, 1, 2].map((k) => (
            <rect key={k} x={-38} y={-56 + k * 26} width={bar(k)} height={13} rx={6.5} fill={accent} opacity={0.92} />
          ))}
          <g transform={`translate(46 -74) scale(${heartS})`}><HeartPath s={2.6} fill={ROSE} /></g>
        </g>,
      );
    }
    case "check": {
      const draw = interpolate(frame, [6, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return wrap(<>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
          <g key={k} transform={`rotate(${k * 45 + frame * 1.1})`} opacity={0.35 + 0.4 * Math.abs(Math.sin(frame / 6 + k))}>
            <line x1={0} y1={-62} x2={0} y2={-74} stroke={accent} strokeWidth={5} strokeLinecap="round" />
          </g>
        ))}
        <g transform={`scale(${pop})`}>
          <circle r={54} fill={chip} stroke={accent} strokeWidth={6} />
          <path d="M -20 4 L -6 18 L 24 -14" fill="none" stroke="#fff" strokeWidth={9}
            strokeLinecap="round" strokeLinejoin="round" strokeDasharray={80} strokeDashoffset={80 * (1 - draw)} />
        </g>
      </>);
    }
    case "heart": {
      const beat = 1 + 0.15 * Math.sin(frame / 4);
      return wrap(<>
        {[0, 1, 2].map((k) => {
          const y = 55 - ((frame * 1.8 + k * 42) % 135);
          const x = [-62, 58, 8][k] + Math.sin(frame / 8 + k) * 7;
          const op = Math.min((y + 60) / 24, (90 - y) / 24, 1);
          return <g key={k} transform={`translate(${x} ${y})`} opacity={Math.max(op, 0)}><HeartPath s={1.6 + k * 0.25} fill={ROSE} /></g>;
        })}
        <circle r={62} fill={accent} opacity={0.14 + 0.06 * Math.sin(frame / 4)} />
        <g transform={`scale(${pop * beat})`}><HeartPath s={6.2} fill={ROSE} /></g>
      </>);
    }
    case "fire": {
      const sy = 1 + 0.16 * Math.sin(frame / 3);
      const sk = Math.sin(frame / 5) * 5;
      return wrap(<>
        {[0, 1, 2, 3].map((k) => {
          const y = 60 - ((frame * 2.4 + k * 38) % 140);
          const x = [-40, 34, 62, -66][k];
          const op = Math.min((y + 60) / 22, (100 - y) / 22, 1);
          return <circle key={k} cx={x} cy={y} r={5} fill={GOLD} opacity={Math.max(op, 0)} />;
        })}
        <g transform={`translate(0 20) scale(${pop})`}>
          <g transform={`scale(1 ${sy}) skewX(${sk})`}>
            <path d="M0 -46 C17 -24 27 -9 27 10 A27 27 0 1 1 -27 10 C-27 -9 -17 -24 0 -46 Z" fill={GOLD} />
          </g>
          <g transform={`scale(1 ${1 + 0.2 * Math.sin(frame / 3 + 1)}) translate(0 6)`}>
            <path d="M0 -22 C11 -10 15 -3 15 8 A15 15 0 1 1 -15 8 C-15 -3 -11 -10 0 -22 Z" fill="#fff7ed" />
          </g>
        </g>
      </>);
    }
    case "alert": {
      const dx = Math.sin(frame / 2) * 6;
      return wrap(
        <g transform={`translate(${dx} 0)`}>
          <g transform={`scale(${pop})`}>
            <path d="M0 -50 L48 36 L-48 36 Z" fill={RED} stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
            <text y={18} textAnchor="middle" fontSize={46} fontWeight={900} fill="#fff">!</text>
          </g>
        </g>,
      );
    }
    case "clock": {
      return wrap(
        <g transform={`scale(${pop})`}>
          <circle r={54} fill={chip} stroke="#fff" strokeWidth={6} />
          {[...Array(12)].map((_, k) => (
            <line key={k} transform={`rotate(${k * 30})`} x1={0} y1={-46} x2={0} y2={-50} stroke="#fff" strokeWidth={3.5} opacity={0.85} />
          ))}
          <line transform={`rotate(${frame * 2})`} x1={0} y1={0} x2={0} y2={-26} stroke="#fff" strokeWidth={8} strokeLinecap="round" />
          <line transform={`rotate(${frame * 9})`} x1={0} y1={0} x2={0} y2={-42} stroke={accent} strokeWidth={6} strokeLinecap="round" />
          <circle r={6} fill={accent} />
        </g>,
      );
    }
    case "chat": {
      const dy = (k: number) => -Math.abs(Math.sin(frame / 5 + k * 0.9)) * 16;
      return wrap(
        <g transform={`scale(${pop}) translate(0 ${Math.sin(frame / 11) * 5})`}>
          <rect x={-108} y={-58} width={216} height={116} rx={28} fill={chip} stroke={accent} strokeWidth={5} />
          <path d="M -44 56 L -26 88 L -4 56 Z" fill={chip} stroke={accent} strokeWidth={5} strokeLinejoin="round" />
          <rect x={-46} y={54} width={52} height={10} fill={chip} />
          {[0, 1, 2].map((k) => <circle key={k} cx={-52 + k * 52} cy={0} r={12} fill={accent} transform={`translate(0 ${dy(k)})`} />)}
        </g>,
      );
    }
    case "rocket": {
      return wrap(<>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <circle key={k} cx={(rnd(k) - 0.5) * 240} cy={(rnd(k + 40) - 0.5) * 240} r={3}
            fill="#fff" opacity={0.25 + 0.45 * Math.abs(Math.sin(frame / 8 + k * 1.7))} />
        ))}
        {[-58, 58].map((x, k) => (
          <line key={k} x1={x} y1={((frame * 7 + k * 90) % 230) - 115} x2={x} y2={((frame * 7 + k * 90) % 230) - 85}
            stroke="#fff" strokeWidth={4} opacity={0.35} strokeLinecap="round" />
        ))}
        <g transform={`rotate(${Math.sin(frame / 9) * 5})`}>
          <g transform={`scale(${pop}) translate(0 ${Math.sin(frame / 6) * 4})`}>
            <path d="M0 26 C 9 34, 7 48, 0 62 C -7 48, -9 34, 0 26 Z" fill={GOLD}
              transform={`translate(0 4) scale(1 ${(1 + 0.3 * Math.sin(frame * 1.3))})`} />
            <path d="M0 -58 C17 -36 23 -8 19 24 L -19 24 C -23 -8 -17 -36 0 -58 Z" fill={chip} stroke={accent} strokeWidth={5} />
            <circle cy={-16} r={13} fill={accent} opacity={0.9} />
            <path d="M -19 8 L -34 30 L -19 26 Z" fill={accent} />
            <path d="M 19 8 L 34 30 L 19 26 Z" fill={accent} />
          </g>
        </g>
      </>);
    }
    case "counter": {
      const mm = text.match(/(\d+([.,]\d+)?)/);
      if (!mm) return wrap(<g transform={`rotate(${frame * 3}) scale(${pop})`}>
        <path d="M0 -34 L9 -9 L34 0 L9 9 L0 34 L-9 9 L-34 0 L-9 -9 Z" fill={accent} />
      </g>);
      const target = parseFloat(mm[1].replace(",", "."));
      const p = interpolate(frame, [5, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const v = target * (1 - Math.pow(1 - p, 3));
      const show = target >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
      const unit = /%/.test(text) ? "%" : "";
      const C = 2 * Math.PI * 56;
      return wrap(<>
        <circle r={56} fill={chip} stroke={accent} strokeWidth={9} strokeDasharray={C} strokeDashoffset={C * (1 - p)}
          transform="rotate(-90)" strokeLinecap="round" opacity={0.95} />
        <g transform={`scale(${pop})`}>
          <text textAnchor="middle" dominantBaseline="central" fontSize={target >= 1000 ? 40 : 56} fontWeight={900} fill="#fff">
            {show}{unit}
          </text>
        </g>
      </>);
    }
    default: { // slide — bintang berputar + orbit
      return wrap(<>
        <circle r={70} fill="none" stroke={accent} strokeWidth={2} opacity={0.35} strokeDasharray="6 14"
          transform={`rotate(${frame * 2})`} />
        <g transform={`rotate(${frame * 3}) scale(${pop})`}>
          <path d="M0 -38 L10 -10 L38 0 L10 10 L0 38 L-10 10 L-38 0 L-10 -10 Z" fill={accent}
            transform={`scale(${idle})`} />
        </g>
      </>);
    }
  }
};

/* ═══════════════ LATAR: partikel naik + blob ═══════════════ */

const Particles: React.FC<{ accent: string; dur: number }> = ({ accent, dur }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {[...Array(14)].map((_, k) => {
        const x = rnd(k) * 540;
        const base = rnd(k + 50) * 960;
        const speed = 1.2 + rnd(k + 130) * 2.2;
        const y = ((base - frame * speed) % 960 + 960) % 960;
        return (
          <div key={k} style={{
            position: "absolute", left: x + Math.sin(frame / 40 + k) * 14, top: y,
            width: 4 + rnd(k + 90) * 6, height: 4 + rnd(k + 90) * 6, borderRadius: 99,
            background: accent, opacity: 0.12 + 0.14 * Math.abs(Math.sin(frame / 9 + k)),
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/* ═══════════════ SCENE ═══════════════ */

const Judul: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const size = text.length > 26 ? 38 : text.length > 16 ? 48 : 58;
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 140, mass: 0.6 } });
  const floatY = Math.sin(frame / 10) * 5;
  const y = interpolate(s, [0, 1], [90, 0]) + floatY * Math.min(s, 1);
  const scaleX = interpolate(s, [0, 1], [0.6, 1]);
  const lineW = interpolate(frame, [6, 30], [0, 240], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const q = /\?/.test(text);
  return (
    <div style={{ position: "relative", transform: `translateY(${y}px) scale(${scaleX})`, opacity: Math.min(s * 2, 1), textAlign: "center" }}>
      <div style={{ fontSize: size, lineHeight: 1.15, color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,.45)", whiteSpace: "pre-wrap", letterSpacing: -0.5 }}>
        {text}
      </div>
      {q && (
        <div style={{
          position: "absolute", right: -10, top: -18, fontSize: size * 0.95, color: accent,
          transform: `rotate(${Math.sin(frame / 6) * 14}deg) translateY(${Math.sin(frame / 8) * 9}px)`,
          opacity: Math.max(0, Math.min(1, (frame - 14) / 10)), textShadow: "0 4px 24px rgba(0,0,0,.45)",
        }}>?</div>
      )}
      <div style={{ marginTop: 14, height: 8, width: lineW, borderRadius: 4, background: accent, margin: "14px auto 0" }} />
    </div>
  );
};

const BulletScene: React.FC<{ t: string; a: AnimId; idx: number; accent: string; chip: string }> =
  ({ t, a, idx, accent, chip }) => {
    const frame = useCurrentFrame();
    const floatY = Math.sin(frame / 12 + idx * 1.3) * 6;
    const fs = t.length > 46 ? 25 : t.length > 32 ? 28 : 31;
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 40 }}>
        {a === "alert" && <AbsoluteFill style={{ background: RED, opacity: 0.09 + 0.07 * Math.abs(Math.sin(frame / 2)) }} />}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, transform: `translateY(${floatY}px)`, maxWidth: 480 }}>
          <div style={{ height: 195, display: "flex", alignItems: "center", justifyContent: "center", filter: `drop-shadow(0 10px 30px ${accent}55)` }}>
            <SceneIcon a={a} text={t} accent={accent} chip={chip} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 23, background: accent, color: "#0b0b0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, fontWeight: 900, boxShadow: `0 0 20px ${accent}66` }}>
              {idx + 1}
            </div>
            <div style={{ background: `${chip}cc`, borderRadius: 18, padding: "15px 20px", fontSize: fs, lineHeight: 1.25, color: "#fff", fontWeight: 700 }}>
              {t}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    );
  };

const Cta: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 10, stiffness: 160, mass: 0.5 } });
  const pulse = 1 + Math.sin(frame / 4) * 0.035;
  const shine = ((frame % 42) / 42) * 520 - 220;
  const bob = Math.sin(frame / 4) * 7;
  const size = text.length > 22 ? 34 : text.length > 14 ? 40 : 46;
  const glow = 40 + Math.sin(frame / 3) * 22;
  return (
    <div style={{ transform: `scale(${s * pulse})`, opacity: Math.min(s * 2, 1), display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ position: "relative", overflow: "hidden", background: accent, borderRadius: 26, padding: "24px 36px", fontSize: size, fontWeight: 900, color: "#0b0b0b", letterSpacing: 1, boxShadow: `0 0 ${glow}px ${accent}88`, whiteSpace: "pre-wrap", textAlign: "center" }}>
        {text}
        <div style={{ position: "absolute", top: 0, bottom: 0, width: 64, left: shine, background: "linear-gradient(100deg, transparent, rgba(255,255,255,.55), transparent)", transform: "skewX(-18deg)" }} />
      </div>
      <span style={{ fontSize: 44, color: accent, transform: `translateX(${bob}px)`, textShadow: `0 0 ${glow}px ${accent}` }}>→</span>
    </div>
  );
};

/* ═══════════════ KOMPOSISI ═══════════════ */

export const MotionStudio: React.FC<MotionStudioProps> = (props) => {
  const { judul, bullets, cta, warna, sfx } = props;
  const frame = useCurrentFrame();
  const dur = motionDurationFrames(props);
  const pal = PALETTES[(warna || "green") as WarnaId] || PALETTES.green;
  const items = motionScenes(props);
  const ctaStart = MOTION_CTA_START(props);

  const drift = interpolate(frame, [0, dur], [0, 1]);
  const bgStyle: React.CSSProperties = {
    background: [
      `radial-gradient(circle at ${28 + drift * 14}% 22%, ${pal.accent}2e, transparent 52%)`,
      `radial-gradient(circle at ${72 - drift * 12}% 78%, ${pal.accent}24, transparent 48%)`,
      `linear-gradient(160deg, ${pal.bg} 0%, ${pal.bg2} 100%)`,
    ].join(","),
  };

  const prog = Math.min(frame / Math.max(dur - 1, 1), 1);

  return (
    <AbsoluteFill style={{ ...bgStyle, fontFamily: '"Montserrat XB", "Montserrat ExtraBold", sans-serif' }}>
      <Particles accent={pal.accent} dur={dur} />

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

      {/* Scene 1: HOOK */}
      <Sequence from={0} durationInFrames={MOTION_BULLET_START}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 40 }}>
          <Judul text={judul || "VIRALIN"} accent={pal.accent} />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: BULLETS — animasi sesuai isi */}
      {items.map((sc, i) => (
        <Sequence key={`b-${i}`} from={MOTION_BULLET_START + i * MOTION_BULLET_LEN} durationInFrames={MOTION_BULLET_LEN}>
          <BulletScene t={sc.t} a={sc.a} idx={i} accent={pal.accent} chip={pal.chip} />
        </Sequence>
      ))}

      {/* Scene 3: CTA */}
      <Sequence from={ctaStart} durationInFrames={Math.max(dur - ctaStart, 1)}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 40 }}>
          <Cta text={cta || "FOLLOW SEKARANG"} accent={pal.accent} />
        </AbsoluteFill>
      </Sequence>

      <div style={{ position: "absolute", bottom: 0, left: 0, height: 6, width: `${prog * 100}%`, background: pal.accent, opacity: 0.85 }} />
    </AbsoluteFill>
  );
};
