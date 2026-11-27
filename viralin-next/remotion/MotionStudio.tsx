/** Komposisi Remotion "Motion Studio" — 9:16 540x960, 30fps.
 *  Animasi SESUAI ISI: tiap poin dapat arketipe visual sendiri (21 arketipe) +,
 *  di mode AI/Berita, latar ILUSTRASI AI per poin (img) — jadi scene benar-benar
 *  menggambarkan topik yang dibicarakan, bukan sekadar ikon generik.
 *  Standar desain mengikuti HUKUM bang-motion (skill .agent/skills/bang-motion):
 *  adegan hidup & tak kembar (3 varian layout berputar), latar per segmen
 *  bernapas (blob + bentuk berputar + sapuan cahaya), teks tanpa titik otomatis,
 *  counter tabular-nums, dan DETERMINISTIK penuh (fungsi murni frame — tanpa
 *  Math.random/Date.now) sehingga render frame-by-frame identik.
 *  Durasi tiap bagian diatur dari form (hookdur/bulletdur/ctadur, detik) — dengan
 *  NARASI (Edge TTS) durasi tiap bagian mengikuti panjang narasinya (p.durs dari
 *  server) dan detailnya muncul sebagai CAPTION KARAOKE sinkron suara (p.words
 *  dari whisper): teks besar = gambaran besar, narasi = detailnya.
 *  Dipakai bersama: <Player> di browser (live preview) DAN renderMedia di server.
 *  Aturan remotion-motion-graphics yang diterapkan di sini: theme tunggal
 *  (remotion/theme.ts, tanpa hex/easing/spring inline), easing di SEMUA
 *  interpolate(), exit 10 frame lebih cepat dari entrance, stagger kata
 *  3 frame, Ken Burns di gambar ilustrasi, dan 5-layer stack
 *  (background → aset → grafis → Grade → Grain + Vignette). */
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import { MOTION_THEME } from "./theme";
import { Grade, Grain, Vignette } from "./layers";
import { TextKinetic } from "./scenes/TextKinetic";
import { ListStaggered } from "./scenes/ListStaggered";
import { ListNumberedVertical } from "./scenes/ListNumberedVertical";
import { TextCounter } from "./scenes/TextCounter";
import { BackgroundMeshGradient } from "./scenes/BackgroundMeshGradient";
import { ParticleBubbles } from "./scenes/ParticleBubbles";
import { ParticleConfetti } from "./scenes/ParticleConfetti";
import {
  MOTION_CTA_START,
  PALETTES,
  motionDurationFrames,
  motionSectionFrames,
  motionScenes,
  motionImgs,
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
/** Font Anton utk caption karaoke narasi (gaya Hormozi — sama dgn ViralKonten). */
if (typeof document !== "undefined" && !document.fonts.check('20px "Anton VB"')) {
  const handle = delayRender("anton-vb-motion");
  new FontFace("Anton VB", `url(${staticFile("fonts/Anton-Regular.ttf")})`)
    .load()
    .then((loaded) => { document.fonts.add(loaded); continueRender(handle); })
    .catch(() => continueRender(handle));
}

/** pseudo-random deterministik (partikel dsb. stabil antar render). */
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const GOLD = MOTION_THEME.colors.gold, GOLD_D = MOTION_THEME.colors.goldDark, ROSE = MOTION_THEME.colors.rose, RED = MOTION_THEME.colors.red;
const { ease: EASE, spring: SPRING } = MOTION_THEME;

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

const SceneIcon: React.FC<{ a: AnimId; accent: string; chip: string }> = ({ a, accent, chip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: SPRING.bouncy });
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
      const draw = interpolate(frame, [6, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.out });
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
      // angka ditangani TextCounter (scene); di sini hanya fallback bintang
      return wrap(<g transform={`rotate(${frame * 3}) scale(${pop})`}>
        <path d="M0 -34 L9 -9 L34 0 L9 9 L0 34 L-9 9 L-34 0 L-9 -9 Z" fill={accent} />
      </g>);
    }
    case "kuliner": { // cangkir + uap mengepul
      const steam = (k: number) => Math.sin(frame / 6 + k * 1.4) * 10;
      return wrap(
        <g transform={`scale(${pop}) translate(0 ${Math.sin(frame / 10) * 5})`}>
          {[0, 1, 2].map((k) => (
            <path key={k} d={`M ${-28 + k * 28} -58 q 8 ${-16 + steam(k)} 0 ${-30 + steam(k) * 0.6}`}
              fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.6 + 0.3 * Math.sin(frame / 4 + k)} />
          ))}
          <path d="M -50 -18 L 50 -18 L 40 44 A 14 14 0 0 1 26 56 L -26 56 A 14 14 0 0 1 -40 44 Z"
            fill={chip} stroke={accent} strokeWidth={5} />
          <path d="M 50 -8 A 22 22 0 0 1 50 34" fill="none" stroke={accent} strokeWidth={7} />
          <ellipse cy={-18} rx={50} ry={9} fill={GOLD} stroke={GOLD_D} strokeWidth={3} />
        </g>,
      );
    }
    case "bola": { // bola spin + patch
      return wrap(
        <g transform={`translate(0 ${Math.sin(frame / 8) * 8})`}>
          <g transform={`scale(${pop})`}>
            <circle r={54} fill="#fff" stroke={GOLD_D} strokeWidth={4} />
            <g transform={`rotate(${frame * 6})`}>
              <path d="M 0 -22 L 21 -7 L 13 18 L -13 18 L -21 -7 Z" fill={GOLD_D} />
              {[0, 72, 144, 216, 288].map((deg) => (
                <line key={deg} transform={`rotate(${deg})`} x1={0} y1={-22} x2={0} y2={-54} stroke={GOLD_D} strokeWidth={4} />
              ))}
            </g>
          </g>
        </g>,
      );
    }
    case "belajar": { // buku + halaman berganti
      const flip = (frame % 40) / 40;
      const pw = 50 * Math.sin(Math.PI * flip);
      return wrap(
        <g transform={`scale(${pop}) translate(0 ${Math.sin(frame / 11) * 5})`}>
          <path d="M 0 -46 L -78 -38 L -78 46 L 0 38 Z" fill={chip} stroke={accent} strokeWidth={4} />
          <path d="M 0 -46 L 78 -38 L 78 46 L 0 38 Z" fill={chip} stroke={accent} strokeWidth={4} />
          {[-40, -16, 8, 32].map((yy, k) => (
            <line key={k} x1={-64} y1={yy} x2={-14} y2={yy + 6} stroke="#fff" strokeWidth={4} opacity={0.7} />
          ))}
          {[-40, -16, 8, 32].map((yy, k) => (
            <line key={`r${k}`} x1={14} y1={yy + 6} x2={64} y2={yy} stroke="#fff" strokeWidth={4} opacity={0.7} />
          ))}
          <path d={`M 0 -46 L ${pw} ${-46 + 8 * Math.sin(Math.PI * flip)} L ${pw} ${38 + 8 * Math.sin(Math.PI * flip)} L 0 38 Z`} fill="#fff" opacity={0.85} />
        </g>,
      );
    }
    case "medis": { // palang + garis EKG menggambar
      const beat = 1 + 0.1 * Math.max(0, Math.sin(frame / 3)) * Math.max(0, Math.sin(frame / 6));
      return wrap(<>
        <g transform={`scale(${pop * beat})`}>
          <rect x={-16} y={-52} width={32} height={96} rx={8} fill={RED} />
          <rect x={-48} y={-16} width={96} height={32} rx={8} fill={RED} />
        </g>
        <g transform="translate(0 82)">
          <path d="M -90 0 L -40 0 L -28 -22 L -12 26 L 0 -10 L 10 0 L 90 0" fill="none" stroke="#fff" strokeWidth={5}
            strokeLinecap="round" strokeLinejoin="round" strokeDasharray="220" strokeDashoffset={220 * (1 - Math.min(frame / 40, 1))} />
        </g>
      </>);
    }
    case "musik": { // equalizer + not bergoyang
      const bars = [0, 1, 2, 3, 4].map((k) => 20 + 34 * Math.abs(Math.sin(frame / 4 + k * 0.9)));
      return wrap(<>
        {bars.map((h, k) => (
          <rect key={k} x={-96 + k * 26} y={70 - h} width={16} height={h} rx={6} fill={k % 2 ? accent : GOLD} opacity={0.9} />
        ))}
        <g transform={`translate(28 -30) rotate(${Math.sin(frame / 5) * 12}) scale(${pop})`}>
          <circle cx={-30} cy={44} r={16} fill="#fff" />
          <rect x={-18} y={-44} width={9} height={88} fill="#fff" transform="rotate(8 -18 -44)" />
          <path d="M -9 -44 q 30 8 38 34 q -14 -12 -38 -8 Z" fill="#fff" />
        </g>
      </>);
    }
    case "travel": { // pesawat melintas + awan + jalur putus-putus
      const tx = -70 + Math.min(frame * 3.2, 140);
      return wrap(<>
        <path d="M -110 70 A 150 150 0 0 1 110 -60" fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="10 14" opacity={0.5} />
        {[[-70, -70], [60, 10], [-40, -100]].map(([x, y], k) => (
          <ellipse key={k} cx={x + Math.sin(frame / 9 + k) * 8} cy={y} rx={34} ry={14} fill="#fff" opacity={0.35} />
        ))}
        <g transform={`translate(${tx} ${30 - frame * 0.9}) rotate(-8) scale(${pop * 0.9})`}>
          <path d="M -34 6 L 30 -14 L 40 -6 L -6 16 L -10 34 L -20 22 L -34 6 Z" fill={accent} stroke="#fff" strokeWidth={3} strokeLinejoin="round" />
        </g>
      </>);
    }
    case "cuaca": { // matahari + awan + hujan
      return wrap(<>
        <circle cx={-52} cy={-46} r={26} fill={GOLD} opacity={0.9} />
        {[...Array(8)].map((_, k) => (
          <line key={k} transform={`rotate(${k * 45 + frame * 1.5} -52 -46)`} x1={-52} y1={-82} x2={-52} y2={-92} stroke={GOLD} strokeWidth={5} strokeLinecap="round" />
        ))}
        <g transform={`translate(0 ${Math.sin(frame / 10) * 4}) scale(${pop})`}>
          <ellipse cx={-18} cy={0} rx={52} ry={26} fill="#fff" opacity={0.92} />
          <ellipse cx={30} cy={-12} rx={34} ry={22} fill="#fff" opacity={0.92} />
          <ellipse cx={-52} cy={-6} rx={30} ry={18} fill="#fff" opacity={0.92} />
          {[0, 1, 2, 3].map((k) => {
            const ry = (frame * 4 + k * 22) % 44;
            return <line key={k} x1={-44 + k * 28} y1={30 + ry} x2={-48 + k * 28} y2={44 + ry} stroke={accent} strokeWidth={5} strokeLinecap="round" opacity={1 - ry / 44} />;
          })}
        </g>
      </>);
    }
    case "game": { // gamepad + tombol kelap-kelip
      const bl = (k: number) => 0.55 + 0.45 * Math.abs(Math.sin(frame / 5 + k));
      return wrap(
        <g transform={`translate(${Math.sin(frame / 3) * 4} 0) scale(${pop})`}>
          <rect x={-96} y={-42} width={192} height={84} rx={40} fill={chip} stroke={accent} strokeWidth={5} />
          <rect x={-62} y={-16} width={34} height={12} rx={5} fill="#fff" />
          <rect x={-51} y={-27} width={12} height={34} rx={5} fill="#fff" />
          {[0, 1].map((k) => (
            <circle key={k} cx={56 + k * 26} cy={k % 2 ? -10 : 8} r={11} fill={k % 2 ? ROSE : GOLD} opacity={bl(k)} />
          ))}
        </g>,
      );
    }
    case "mega": { // megafon berita + gelombang suara
      return wrap(
        <g transform={`rotate(${Math.sin(frame / 4) * 6}) scale(${pop})`}>
          <path d="M -96 -14 L -24 -30 L -24 46 L -96 30 Z" fill={accent} stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
          <ellipse cx={-24} cy={8} rx={13} ry={38} fill={GOLD} stroke={GOLD_D} strokeWidth={3} />
          <rect x={-88} y={26} width={20} height={30} rx={6} fill={chip} stroke="#fff" strokeWidth={3} />
          {[0, 1, 2].map((k) => (
            <path key={k} d={`M 4 ${-30 + k * 26} A ${46 + k * 14} ${46 + k * 14} 0 0 1 4 ${38 + k * 26}`}
              fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round"
              opacity={0.7 * Math.abs(Math.sin(frame / 6 - k * 0.7))} />
          ))}
        </g>,
      );
    }
    case "target": { // panah melesat ke papan target
      const hit = Math.min(frame / 18, 1);
      const ax = -100 + 100 * (1 - Math.pow(1 - hit, 2));
      const bang = frame > 16 ? 1 + 0.16 * Math.max(0, Math.sin((frame - 16) / 5)) : 1;
      return wrap(<>
        <g transform={`scale(${pop * bang})`}>
          {[0, 1, 2].map((k) => (
            <circle key={k} r={56 - k * 18} fill={k % 2 ? chip : RED} stroke="#fff" strokeWidth={3} />
          ))}
          <circle r={4} fill="#fff" />
        </g>
        <g transform={`translate(${ax} 0) rotate(${Math.min(frame * 3, 42)})`}>
          <line x1={-20} y1={0} x2={26} y2={0} stroke={GOLD} strokeWidth={7} strokeLinecap="round" />
          <path d="M 26 0 L 12 -9 L 12 9 Z" fill={GOLD} />
          <path d="M -20 0 L -30 -10 L -26 0 L -30 10 Z" fill={ROSE} />
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

/* ═══════════════ SCENE ═══════════════ */

/** Kata beranimasi (kinetic typography) — pop per kata + float halan terus. */
const Word: React.FC<{ w: string; i: number; size: number }> = ({ w, i, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - i * 3, fps, config: SPRING.snappy });
  const floatY = Math.sin(frame / 9 + i * 1.1) * 3;
  return (
    <span style={{
      display: "inline-block", marginRight: size * 0.26, color: "#fff",
      transform: `translateY(${(1 - s) * 30 + floatY}px) scale(${0.6 + 0.4 * s}) rotate(${(1 - s) * (i % 2 ? 7 : -7)}deg)`,
      opacity: Math.min(s * 2.5, 1),
    }}>{w}</span>
  );
};

const Judul: React.FC<{ text: string; accent: string; hookF: number }> = ({ text: raw, accent, hookF }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const text = raw.replace(/[.。]+$/, ""); // tanpa titik otomatis (Hukum #4 bang-motion)
  const size = text.length > 26 ? 38 : text.length > 16 ? 48 : 58;
  const s = spring({ frame, fps, config: SPRING.smooth });
  // Ken Burns masuk + exit keluar di akhir scene hook (bukan hard cut)
  const zoom = interpolate(frame, [0, hookF], [1, 1.06], { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: EASE.inOut });
  const exitP = interpolate(frame, [hookF - 10, hookF - 1], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: EASE.in });
  const floatY = Math.sin(frame / 10) * 5;
  const y = (interpolate(s, [0, 1], [90, 0]) + floatY) * (1 - exitP) - exitP * 44;
  const scale = interpolate(s, [0, 1], [0.6, 1]) * zoom * (1 - 0.07 * exitP);
  const q = /\?/.test(text);
  return (
    <div style={{ position: "relative", transform: `translateY(${y}px) scale(${scale})`, opacity: Math.min(s * 2, 1) * (1 - exitP), textAlign: "center" }}>
      <TextKinetic text={text} accent={accent} size={size} />
      {q && (
        <div style={{
          position: "absolute", right: -10, top: -18, fontSize: size * 0.95, color: accent,
          transform: `rotate(${Math.sin(frame / 6) * 14}deg) translateY(${Math.sin(frame / 8) * 9}px)`,
          opacity: Math.max(0, Math.min(1, (frame - 14) / 10)) * (1 - exitP), textShadow: "0 4px 24px rgba(0,0,0,.45)",
        }}>?</div>
      )}
    </div>
  );
};

const BulletScene: React.FC<{ t: string; a: AnimId; idx: number; accent: string; chip: string; bulletF: number; img: string }> =
  ({ t, a, idx, accent, chip, bulletF, img }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    // entrance pop + exit keluar + Ken Burns zoom — scene tidak pernah hard cut
    const enter = spring({ frame, fps, config: SPRING.smooth });
    const exitP = interpolate(frame, [bulletF - 10, bulletF - 1], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: EASE.in });
    const zoom = interpolate(frame, [0, bulletF], [1, 1.05], { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: EASE.inOut });
    /* Ken Burns gambar ilustrasi (skill remotion-motion-graphics §8):
     * scale 1 → 1.08 + pan -25px, easing inOut — bukan zoom linear. */
    const kbScale = interpolate(frame, [0, bulletF], [1, 1.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.inOut });
    const kbPan = interpolate(frame, [0, bulletF], [0, -25], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.inOut });
    const floatY = Math.sin(frame / 12 + idx * 1.3) * 6;
    const op = Math.min(enter * 2, 1) * (1 - exitP);
    /* Hukum #4 bang-motion: dua adegan berturut-turut TIDAK boleh sama dalam
     * ukuran, arah masuk, dan posisi teks → 3 varian layout berputar per idx. */
    const variant = idx % 3;
    const y = floatY - exitP * 40; // entrance arah kini dari wrapper scene (ListStaggered/Numbered)
    const fs = (t.length > 46 ? 25 : t.length > 32 ? 28 : 31) + (variant === 1 ? 2 : 0);
    const text = t.replace(/[.。]+$/, ""); // tanpa titik otomatis (Hukum #4)
    const glow = 26 + Math.sin(frame / 5 + idx) * 14;
    /* Latar segmen hidup (bang-motion §7c/§7d — bukan flat, bukan diam):
     * blob accent bernapas di posisi berbeda tiap adegan + bentuk besar
     * berputar lambat di sudut bergantian + sapuan cahaya sekali saat masuk. */
    const blobX = 20 + (idx % 2) * 55 + Math.sin(frame / 17 + idx * 2) * 8;
    const blobY = 16 + (idx % 3) * 26 + Math.cos(frame / 21 + idx) * 8;
    const corner = ["-150px -130px auto auto", "auto -150px -150px auto", "auto auto -140px -150px"][variant];
    const sweep = interpolate(frame, [2, 18], [-1.2, 1.2], { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: EASE.out });
    const IconBox: React.FC<{ h: number }> = ({ h }) => (
      <div style={{ height: h, display: "flex", alignItems: "center", justifyContent: "center", filter: `drop-shadow(0 10px ${glow}px ${accent}66)` }}>
        {a === "counter" && /(\d+([.,]\d+)?)/.test(t)
          ? <TextCounter text={t} accent={accent} chip={chip} />
          : <SceneIcon a={a} accent={accent} chip={chip} />}
      </div>
    );
    const NumBadge: React.FC<{ s: number }> = ({ s }) => (
      <div style={{
        flexShrink: 0, width: s, height: s, borderRadius: s / 2, background: accent, color: "#0b0b0b",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: idx > 8 ? 16 : 21, fontWeight: 900,
        boxShadow: `0 0 ${glow}px ${accent}66`, transform: `scale(${Math.min(enter * 1.6, 1)})`,
      }}>
        {idx + 1}
      </div>
    );
    const PillText: React.FC<{ size: number; weight?: number }> = ({ size, weight = 700 }) => (
      <div style={{ background: `${chip}cc`, borderRadius: 18, padding: "15px 20px", fontSize: size, lineHeight: 1.3, color: "#fff", fontWeight: weight }}>
        {text.split(/\s+/).map((w, i) => <Word key={i} w={w} i={i + 3} size={size} />)}
      </div>
    );
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 40 }}>
        {/* latar segmen: blob bernapas (posisi + fasa beda tiap adegan) */}
        <AbsoluteFill style={{ background: `radial-gradient(circle at ${blobX}% ${blobY}%, ${accent}2b, transparent 55%)` }} />
        {/* bentuk besar berputar lambat — sudut bergantian per varian */}
        <svg viewBox="-140 -140 280 280" width={430} height={430} style={{ position: "absolute", inset: corner, opacity: 0.13, pointerEvents: "none" }}>
          <circle r={110} fill="none" stroke={accent} strokeWidth={3} strokeDasharray="14 22" transform={`rotate(${frame * 0.8})`} />
          <circle r={78} fill="none" stroke={accent} strokeWidth={2} strokeDasharray="6 18" transform={`rotate(${-frame * 1.3})`} />
        </svg>
        {/* sapuan cahaya sekali di awal segmen (di balik konten, di atas latar) */}
        <AbsoluteFill style={{
          background: `linear-gradient(115deg, transparent 42%, rgba(255,255,255,.16) 50%, transparent 58%)`,
          transform: `translateX(${sweep * 640}px)`, opacity: Math.max(0, 1 - frame / 20),
        }} />
        {img && (
          <AbsoluteFill>
            {/* URL absolut (http…) → renderer server; relatif → staticFile (Player browser) */}
            <Img src={img.startsWith("http") ? img : staticFile(img)} style={{
              width: "100%", height: "100%", objectFit: "cover",
              transform: `scale(${1.12 * kbScale}) translateX(${kbPan}px)`,
              opacity: 0.85 * Math.min(enter * 2, 1) * (1 - exitP),
            }} />
            <AbsoluteFill style={{ background: `linear-gradient(180deg, ${chip}55 0%, ${chip}d9 100%)` }} />
          </AbsoluteFill>
        )}
        {a === "alert" && <AbsoluteFill style={{ background: RED, opacity: (0.09 + 0.07 * Math.abs(Math.sin(frame / 2))) * (1 - exitP) }} />}
        {variant === 0 && (
          /* varian 0: ikon atas + pill bawah (stacked) — entrance ListStaggered */
          <div style={{
            transform: `translateY(${y}px) scale(${(0.86 + 0.14 * enter) * zoom * (1 - 0.08 * exitP)})`, opacity: op,
          }}>
            <ListStaggered accent={accent}>
              <IconBox h={195} />
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <NumBadge s={46} />
                <PillText size={fs} />
              </div>
            </ListStaggered>
          </div>
        )}
        {variant === 1 && (
          /* varian 1: ikon KIRI + teks kanan — nomor besar ListNumberedVertical */
          <div style={{
            display: "flex", alignItems: "center", gap: 18, maxWidth: 500,
            transform: `translateY(${floatY}px) scale(${(0.86 + 0.14 * enter) * zoom * (1 - 0.08 * exitP)})`, opacity: op,
          }}>
            <IconBox h={150} />
            <ListNumberedVertical num={idx + 1} accent={accent}>
              <PillText size={fs + 2} />
            </ListNumberedVertical>
          </div>
        )}
        {variant === 2 && (
          /* varian 2: teks dulu + ikon di bawah — entrance ListStaggered */
          <div style={{
            transform: `translateY(${floatY}px) scale(${(0.86 + 0.14 * enter) * zoom * (1 - 0.08 * exitP)})`, opacity: op,
          }}>
            <ListStaggered accent={accent}>
              <div style={{
                fontSize: fs + 4, lineHeight: 1.25, fontWeight: 800, color: "#fff",
                textShadow: "0 4px 22px rgba(0,0,0,.5)", textWrap: "balance", textAlign: "center",
              }}>
                {text.split(/\s+/).map((w, i) => <Word key={i} w={w} i={i + 3} size={fs + 4} />)}
              </div>
              <IconBox h={135} />
            </ListStaggered>
          </div>
        )}
      </AbsoluteFill>
    );
  };

const Cta: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: SPRING.bouncy });
  const pulse = 1 + Math.sin(frame / 4) * 0.035;
  const shine = ((frame % 42) / 42) * 520 - 220;
  const bob = Math.sin(frame / 4) * 7;
  const size = text.length > 22 ? 34 : text.length > 14 ? 40 : 46;
  const glow = 40 + Math.sin(frame / 3) * 22;
  return (
    <div style={{ transform: `scale(${s * pulse})`, opacity: Math.min(s * 2, 1), display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ position: "relative" }}>
        <div style={{ position: "relative", overflow: "hidden", background: accent, borderRadius: 26, padding: "24px 36px", fontSize: size, fontWeight: 900, color: "#0b0b0b", letterSpacing: 1, boxShadow: `0 0 ${glow}px ${accent}88`, whiteSpace: "pre-wrap", textAlign: "center" }}>
          {text}
          <div style={{ position: "absolute", top: 0, bottom: 0, width: 64, left: shine, background: "linear-gradient(100deg, transparent, rgba(255,255,255,.55), transparent)", transform: "skewX(-18deg)" }} />
        </div>
      </div>
      <span style={{ fontSize: 44, color: accent, transform: `translateX(${bob}px)`, textShadow: `0 0 ${glow}px ${accent}` }}>→</span>
    </div>
  );
};

/* ═══════════════ CAPTION KARAOKE NARASI ═══════════════ */

/** Kata narasi {w: teks, s/e: detik absolut} — dari whisper di server. */
type NarWord = { w: string; s: number; e: number };

/** NarWord server (detik) → Caption resmi @remotion/captions (ms).
 *  Kata dipastikan berawalan spasi (kecuali kata pertama) supaya
 *  createTikTokStyleCaptions bisa memecah halaman di batas kata. */
const toCaptionWords = (words: NarWord[]): Caption[] =>
  words.map((w, i) => ({
    text: i === 0 ? w.w.trimStart() : w.w.startsWith(" ") ? w.w : ` ${w.w}`,
    startMs: Math.round(w.s * 1000),
    endMs: Math.round(w.e * 1000),
    timestampMs: Math.round(((w.s + w.e) / 2) * 1000),
    confidence: null,
  }));

const CAP_FONT = MOTION_THEME.fonts.caption;

/** Caption karaoke gaya Hormozi: halaman TikTok (createTikTokStyleCaptions,
 *  ~4-5 kata/halaman), kata aktif warna tema + pop + glow — sinkron dgn
 *  voice-over Edge TTS (timing whisper). Jeda antar halaman menahan halaman
 *  terakhir, seperti window geser sebelumnya. */
const NarrCaption: React.FC<{ words: NarWord[]; start: number; end: number; accent: string }> =
  ({ words, start, end, accent }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const pages = React.useMemo(
      () => createTikTokStyleCaptions({ captions: toCaptionWords(words), combineTokensWithinMilliseconds: 1200 }).pages,
      [words],
    );
    if (!pages.length) return null;
    const tMs = (start + frame / fps) * 1000; // frame LOKAL Sequence → ms absolut
    const startMs = start * 1000;
    const endMs = end * 1000;
    let page = pages.find((p) => tMs >= p.startMs && tMs < p.startMs + p.durationMs);
    if (!page) {
      // jeda antar halaman → tahan halaman terakhir yang sudah mulai
      const started = pages.filter((p) => p.startMs <= tMs);
      page = started[started.length - 1];
    }
    if (!page) return null;
    const inScene = page.tokens.filter((t) => t.toMs > startMs + 10 && t.fromMs < endMs - 10);
    if (!inScene.length) return null;
    let act = -1;
    for (let i = 0; i < inScene.length; i++) {
      if (tMs >= inScene[i].fromMs && tMs < inScene[i].toMs) { act = i; break; }
      if (inScene[i].toMs <= tMs) act = i; // gap antar kata → kata terakhir tetap tampil
    }
    if (act < 0) return null;
    return (
      <div style={{
        position: "absolute", left: 26, right: 26, bottom: 108, display: "flex",
        flexWrap: "wrap", justifyContent: "center", gap: "2px 9px", pointerEvents: "none",
      }}>
        {inScene.map((t, k) => {
          const pop = spring({ frame: frame - (k - act) * 3, fps, config: SPRING.snappy });
          const isAct = k === act;
          const done = k < act;
          return (
            <span key={k} style={{
              fontFamily: CAP_FONT, fontSize: 40, lineHeight: 1.15, textTransform: "uppercase",
              color: isAct ? accent : done ? "#fff" : "#ffffffb3",
              transform: `scale(${isAct ? 1.16 * (0.72 + 0.28 * pop) : 0.94 + 0.06 * pop})`,
              transformOrigin: "center bottom",
              WebkitTextStroke: "2.4px #000", paintOrder: "stroke fill",
              textShadow: isAct ? `0 0 22px ${accent}66, 0 4px 16px rgba(0,0,0,.6)` : "0 4px 16px rgba(0,0,0,.6)",
            }}>{t.text.trim()}</span>
          );
        })}
      </div>
    );
  };

/* ═══════════════ KOMPOSISI ═══════════════ */

const ProgressBar: React.FC<{ dur: number; accent: string }> = ({ dur, accent }) => {
  const frame = useCurrentFrame();
  const prog = Math.min(frame / Math.max(dur - 1, 1), 1);
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, height: 6, width: `${prog * 100}%`, background: accent, opacity: 0.85 }} />
  );
};

export const MotionStudio: React.FC<MotionStudioProps> = (props) => {
  const { judul, bullets, cta, warna, sfx } = props;
  const { fps } = useVideoConfig();
  const dur = motionDurationFrames(props);
  const pal = PALETTES[(warna || "green") as WarnaId] || PALETTES.green;
  const items = motionScenes(props);
  const imgs = motionImgs(props);
  // posisi section dari durasi per-bagian (dgn narasi: mengikuti panjang narasi)
  const secF = motionSectionFrames(props);
  const hookF = secF[0];
  const bStarts = items.map((_, i) => secF.slice(0, 1 + i).reduce((a, b) => a + b, 0));
  const ctaStart = MOTION_CTA_START(props);
  // kata narasi utk caption karaoke (JSON dari server; kosong → preview tanpa caption)
  const narrWords = React.useMemo<NarWord[]>(() => {
    try { return JSON.parse(props.words || "[]") as NarWord[]; } catch { return []; }
  }, [props.words]);

  return (
    <AbsoluteFill style={{ fontFamily: MOTION_THEME.fonts.display }}>
      <BackgroundMeshGradient accent={pal.accent} bg={pal.bg} bg2={pal.bg2} />
      <ParticleBubbles accent={pal.accent} />

      {sfx ? (
        <>
          <Sequence from={0}>
            <Audio src={staticFile("sfx/whoosh.wav")} volume={0.9} />
          </Sequence>
          {items.map((_, i) => (
            <Sequence key={`pop-${i}`} from={bStarts[i]}>
              <Audio src={staticFile("sfx/pop.wav")} volume={0.8} />
            </Sequence>
          ))}
          <Sequence from={ctaStart}>
            <Audio src={staticFile("sfx/ding.wav")} volume={0.9} />
          </Sequence>
        </>
      ) : null}

      {/* Scene 1: HOOK */}
      <Sequence from={0} durationInFrames={hookF}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 40 }}>
          <Judul text={judul || "VIRALIN"} accent={pal.accent} hookF={hookF} />
        </AbsoluteFill>
        <NarrCaption words={narrWords} start={0} end={hookF / fps} accent={pal.accent} />
      </Sequence>

      {/* Scene 2: POIN — animasi + ilustrasi sesuai isi + caption narasi */}
      {items.map((sc, i) => (
        <Sequence key={`b-${i}`} from={bStarts[i]} durationInFrames={secF[i + 1]}>
          <BulletScene t={sc.t} a={sc.a} idx={i} accent={pal.accent} chip={pal.chip} bulletF={secF[i + 1]} img={imgs[i] || ""} />
          <NarrCaption words={narrWords} start={bStarts[i] / fps} end={(bStarts[i] + secF[i + 1]) / fps} accent={pal.accent} />
        </Sequence>
      ))}

      {/* Scene 3: CTA */}
      <Sequence from={ctaStart} durationInFrames={Math.max(dur - ctaStart, 1)}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 40 }}>
          <ParticleConfetti accent={pal.accent} />
          <Cta text={cta || "FOLLOW SEKARANG"} accent={pal.accent} />
        </AbsoluteFill>
        <NarrCaption words={narrWords} start={ctaStart / fps} end={dur / fps} accent={pal.accent} />
      </Sequence>

      {/* 5-layer stack: grade di atas konten, grain + vignette paling atas */}
      <Grade accent={pal.accent} />
      <Grain />
      <Vignette />
      <ProgressBar dur={dur} accent={pal.accent} />
    </AbsoluteFill>
  );
};
