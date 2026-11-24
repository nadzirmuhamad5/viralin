/** Komposisi Remotion "ViralKonten" — VIRAL Content Creator v2 (fast-hook).
 *  Konsep hook-cepat ala TikTok/Reels, semuanya bergerak (bukan gambar diam):
 *  1. HOOK (≤3s): pattern-interrupt — teks besar punch-in + shake, badge "JANGAN SKIP",
 *     bg zoom-punch cepat, vignette gelap.
 *  2. POIN per scene: bg AI BERGANTI tiap poin dgn Ken Burns (zoom/pan selalu jalan),
 *     flash-transition 3 frame, chip counter "1/3", karaoke caption word-by-word
 *     (kata aktif kuning + pop) dari word-timing whisper.
 *  3. CTA: pill punch + panah bob + confetti ring (pol Cta MotionStudio).
 *  v2.1 "lebih hidup": SFX whoosh/pop/ding (track audio komposisi, di-mix dgn TTS
 *  saat mux), partikel naik global, kinetic hook per-kata, word-pulse (bg berdenyut
 *  mengikuti ritme suara), emoji chip per poin (dari kata kunci), shine sweep CTA.
 *  Progress bar atas — psikologi "tinggal dikit" → watch-till-end.
 *  Dipakai bersama: renderMedia server (img URL absolut) & Player browser (relatif).
 *  TTS di-mux ffmpeg pasca-render (amix dgn track SFX komposisi). */
import React from "react";
import {
  AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, continueRender, delayRender,
} from "remotion";
import type { ViralKontenProps, ViralScene } from "../lib/viral";
import { viralDurationFrames } from "../lib/viral";

/** Muat font Anton (gaya Hormozi bold-impact) via staticFile — pola resmi Remotion. */
if (typeof document !== "undefined" && !document.fonts.check('20px "Anton VB"')) {
  const handle = delayRender("anton-vb");
  new FontFace("Anton VB", `url(${staticFile("fonts/Anton-Regular.ttf")})`)
    .load()
    .then((loaded) => { document.fonts.add(loaded); continueRender(handle); })
    .catch(() => continueRender(handle));
}

const CAP_FONT = '"Anton VB", "Anton", Impact, sans-serif';
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Emoji per scene dari kata kunci isi teks — aksen visual murah tapi nambah "hidup". */
const emojiFor = (t: string): string => {
  const s = t.toLowerCase();
  if (/(uang|harga|rp\b|rupiah|murah|gratis|hemat|promo|diskon|bayar|gaji|untung)/.test(s)) return "💰";
  if (/(kopi|makan|enak|nagih|lezat|kuliner|buah|masak|susu|gula|minum|rasa|pahit|manis|es\b)/.test(s)) return "🔥";
  if (/(pantai|tempat|wisata|travel|datang|kunjung|liburan|trip|jalan|kota)/.test(s)) return "📍";
  if (/(fakta|tahukah|kenapa|mengapa|sebab|alasan|rahasia|ternyata|jarang)/.test(s)) return "🤯";
  if (/(sehat|tidur|olahraga|badan|kesehatan|stres|stress|kebiasaan)/.test(s)) return "💪";
  if (/(follow|ikuti|komen|share|simpan|bagikan)/.test(s)) return "👉";
  return "✨";
};

/* ═══════════════ PARTIKEL naik pelan (layer global, halus) ═══════════════ */

const Particles: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {[...Array(12)].map((_, k) => {
        const x = rnd(k) * 540;
        const base = rnd(k + 50) * 960;
        const speed = 1.0 + rnd(k + 130) * 1.8;
        const y = ((base - frame * speed) % 960 + 960) % 960;
        return (
          <div key={k} style={{
            position: "absolute", left: x + Math.sin(frame / 44 + k) * 12, top: y,
            width: 3 + rnd(k + 90) * 5, height: 3 + rnd(k + 90) * 5, borderRadius: 99,
            background: accent, opacity: 0.08 + 0.12 * Math.abs(Math.sin(frame / 10 + k)),
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/* ═══════════════ LATAR: Ken Burns yang tidak pernah berhenti ═══════════════ */

const KenBurns: React.FC<{ img: string; durF: number; seed: number; punch?: boolean; bump?: number }> =
  ({ img, durF, seed, punch, bump = 0 }) => {
  const frame = useCurrentFrame();
  const zin = seed % 2 === 0; // alternating zoom in/out — arah beda tiap scene
  // punch: zoom-punch cepat di hook (1.3 → 1.0 dalam 10 frame, easing keluar)
  const punchS = punch ? interpolate(frame, [0, 10], [1.3, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: undefined }) : 1;
  const drift = interpolate(frame, [0, Math.max(durF, 1)], zin ? [1.02, 1.16] : [1.16, 1.02], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const panX = Math.sin((frame / Math.max(durF, 1)) * Math.PI * (0.6 + rnd(seed) * 0.6) + seed * 2.1) * 14;
  const panY = Math.cos((frame / Math.max(durF, 1)) * Math.PI * (0.5 + rnd(seed + 9) * 0.5) + seed) * 10;
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505" }}>
      {img ? (
        <Img src={img.startsWith("http") ? img : staticFile(img)} style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${drift * punchS * (1 + bump)}) translate(${panX}px, ${panY}px)`,
        }} />
      ) : (
        <AbsoluteFill style={{ background: `linear-gradient(160deg, #0a0f0a 0%, #123524 ${40 + rnd(seed) * 30}%, #050505 100%)` }} />
      )}
    </AbsoluteFill>
  );
};

const Vignette: React.FC<{ strength: number }> = ({ strength }) => (
  <AbsoluteFill style={{
    background: `radial-gradient(ellipse at 50% 42%, transparent 30%, rgba(0,0,0,${strength}) 100%)`,
  }} />
);

/* ═══════════════ HOOK: pattern-interrupt ═══════════════ */

const HookScene: React.FC<{ sc: ViralScene; durF: number; highlight: string }> = ({ sc, durF, highlight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 11, stiffness: 170, mass: 0.55 } });
  const shake = Math.sin(frame / 3) * 1.4 * (1 - Math.min(frame / 24, 1)); // getar awal makin tenang
  const exitP = interpolate(frame, [durF - 8, durF - 1], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const size = sc.text.length > 42 ? 34 : sc.text.length > 24 ? 44 : 56;
  const badgeS = spring({ frame: frame - 6, fps, config: { damping: 10, stiffness: 200, mass: 0.4 } });
  const lineW = interpolate(frame, [8, 34], [0, 190], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }) * (1 - exitP);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 36 }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 480,
        transform: `translateY(${(1 - s) * 70}px) scale(${(0.55 + 0.45 * s) * (1 - 0.08 * exitP)}) rotate(${shake}deg)`,
        opacity: Math.min(s * 2, 1) * (1 - exitP),
      }}>
        <div style={{
          background: highlight, color: "#0b0b0b", fontSize: 17, fontWeight: 900, letterSpacing: 2,
          padding: "6px 16px", borderRadius: 999, transform: `scale(${Math.max(badgeS, 0.001)}) rotate(-2deg)`,
          boxShadow: `0 0 26px ${highlight}88`,
        }}>JANGAN SKIP 👀</div>
        <div style={{
          fontFamily: CAP_FONT, fontSize: size, lineHeight: 1.12, textAlign: "center", color: "#fff",
          textTransform: "uppercase", WebkitTextStroke: "2px #000",
          textShadow: "0 6px 30px rgba(0,0,0,.7), 0 0 18px rgba(0,0,0,.5)",
        }}>
          {/* kinetic per-kata — tiap kata punch-in berurutan (bukan blok kaku) */}
          {sc.text.split(/\s+/).map((w, i) => {
            const ws = spring({ frame: frame - i * 2, fps, config: { damping: 12, stiffness: 180, mass: 0.4 } });
            return (
              <span key={i} style={{
                display: "inline-block", marginRight: size * 0.22,
                transform: `translateY(${(1 - ws) * 26}px) scale(${0.5 + 0.5 * ws}) rotate(${(1 - ws) * (i % 2 ? 6 : -6)}deg)`,
                opacity: Math.min(ws * 2, 1),
              }}>{w}</span>
            );
          })}
        </div>
        <div style={{ height: 7, width: lineW, borderRadius: 4, background: highlight }} />
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════ KARAOKE CAPTION (word-by-word) ═══════════════ */

const Karaoke: React.FC<{ sc: ViralScene; words: ViralKontenProps["words"]; highlight: string }> = ({ sc, words, highlight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = sc.start + frame / fps; // frame LOKAL scene (Sequence) → detik absolut
  const inScene = words.filter((w) => w.e > sc.start + 0.01 && w.s < sc.end - 0.01);
  let act = -1;
  for (let i = 0; i < inScene.length; i++) {
    if (t >= inScene[i].s && t < inScene[i].e) { act = i; break; }
    if (inScene[i].e <= t) act = i; // gap antar kata → kata terakhir tetap tampil
  }
  if (act < 0) return null;
  // window geser: kata aktif + 3 kata berikutnya (maks 4 — gaya Hormozi)
  const from = Math.max(0, act);
  const win = inScene.slice(from, from + 4);
  const off = act - from;
  return (
    <div style={{
      position: "absolute", left: 24, right: 24, bottom: 130, display: "flex",
      flexWrap: "wrap", justifyContent: "center", gap: "2px 10px",
    }}>
      {win.map((w, k) => {
        const pop = spring({ frame: frame - (k - off) * 2, fps, config: { damping: 12, stiffness: 190, mass: 0.4 } });
        const isAct = k === off;
        const done = k < off;
        return (
          <span key={k} style={{
            fontFamily: CAP_FONT, fontSize: 56, lineHeight: 1.1, textTransform: "uppercase",
            color: isAct ? highlight : done ? "#fff" : "#ffffffb0",
            transform: `scale(${isAct ? 1.14 * (0.7 + 0.3 * pop) : 0.92 + 0.08 * pop})`,
            transformOrigin: "center bottom",
            WebkitTextStroke: "2.5px #000", paintOrder: "stroke fill",
            textShadow: isAct ? `0 0 24px ${highlight}66, 0 4px 18px rgba(0,0,0,.6)` : "0 4px 16px rgba(0,0,0,.6)",
          }}>{w.w}</span>
        );
      })}
    </div>
  );
};

/* ═══════════════ SCENE POIN + chip counter + flash ═══════════════ */

const PointScene: React.FC<{ sc: ViralScene; idx: number; total: number; durF: number; words: ViralKontenProps["words"]; highlight: string }> =
  ({ sc, idx, total, durF, words, highlight }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const chipS = spring({ frame: frame - 2, fps, config: { damping: 12, stiffness: 180, mass: 0.45 } });
    const flash = Math.max(0, 0.55 * (1 - frame / 3)); // flash-putih cepat saat ganti scene
    // word-pulse: bg berdenyut halus tiap kata baru diucapkan (ritme suara)
    const t = sc.start + frame / fps;
    const inScene = words.filter((w) => w.e > sc.start + 0.01 && w.s < sc.end - 0.01);
    let act = -1;
    for (let i = 0; i < inScene.length; i++) {
      if (t >= inScene[i].s && t < inScene[i].e) { act = i; break; }
      if (inScene[i].e <= t) act = i;
    }
    const actStartF = act >= 0 ? Math.max(0, Math.round((inScene[act].s - sc.start) * fps)) : 0;
    const bump = 0.026 * Math.max(0, 1 - (frame - actStartF) / 7); // denyut cepat lalu meluruh
    // emoji chip kanan-atas — muncul dengan bounce + bob pelan
    const emo = emojiFor(sc.text);
    const emoS = spring({ frame: frame - 6, fps, config: { damping: 9, stiffness: 190, mass: 0.45 } });
    return (
      <AbsoluteFill>
        <KenBurns img={sc.img} durF={durF} seed={idx + 1} bump={bump} />
        <Vignette strength={0.5} />
        <div style={{
          position: "absolute", top: 34, left: 24, display: "flex", alignItems: "center", gap: 10,
          transform: `scale(${Math.max(chipS, 0.001)})`, transformOrigin: "left center",
        }}>
          <div style={{
            background: "rgba(0,0,0,.55)", border: `2px solid ${highlight}`, color: highlight,
            borderRadius: 999, padding: "5px 14px", fontSize: 17, fontWeight: 900, letterSpacing: 1,
          }}>{idx + 1}/{total}</div>
        </div>
        <div style={{
          position: "absolute", top: 26, right: 22, fontSize: 52, lineHeight: 1,
          transform: `scale(${Math.max(emoS, 0.001)}) rotate(${Math.sin(frame / 9) * 8}deg)`,
          filter: `drop-shadow(0 0 ${14 + Math.sin(frame / 5) * 6}px rgba(0,0,0,.5))`,
        }}>{emo}</div>
        <Karaoke sc={sc} words={words} highlight={highlight} />
        <AbsoluteFill style={{ background: "#fff", opacity: flash, pointerEvents: "none" }} />
      </AbsoluteFill>
    );
  };

/* ═══════════════ CTA end-card ═══════════════ */

const CtaScene: React.FC<{ sc: ViralScene; durF: number; highlight: string }> = ({ sc, durF, highlight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 10, stiffness: 160, mass: 0.5 } });
  const pulse = 1 + Math.sin(frame / 4) * 0.035;
  const bob = Math.sin(frame / 4) * 7;
  const size = sc.text.length > 22 ? 32 : sc.text.length > 14 ? 38 : 44;
  const shine = ((frame % 42) / 42) * 520 - 220; // sweep cahaya melintas pill
  const t0 = ((frame - 4) % 28 + 28) % 28; // confetti meledak berulang
  const conf = [...Array(18)].map((_, k) => {
    const ang = (k / 18) * Math.PI * 2 + rnd(k) * 0.6;
    const sp = 80 + rnd(k + 9) * 100;
    const x = Math.cos(ang) * sp * (t0 / 30);
    const y = Math.sin(ang) * sp * (t0 / 30) + 0.045 * t0 * t0;
    return (
      <div key={k} style={{
        position: "absolute", left: `calc(50% + ${x}px)`, top: `calc(46% + ${y}px)`,
        width: 9, height: 13, borderRadius: 2, background: [highlight, "#fb7185", "#fff", "#34d399"][k % 4],
        transform: `translate(-50%,-50%) rotate(${ang * 57 + frame * 5}deg)`,
        opacity: Math.max(0, 1 - t0 / 24),
      }} />
    );
  });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", transform: `scale(${s * pulse})`, opacity: Math.min(s * 2, 1), display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative" }}>
          {conf}
          <div style={{
            position: "relative", overflow: "hidden", background: highlight, borderRadius: 24,
            padding: "20px 30px", fontFamily: CAP_FONT, fontSize: size, color: "#0b0b0b",
            letterSpacing: 1, textTransform: "uppercase", whiteSpace: "pre-wrap", textAlign: "center",
            boxShadow: `0 0 40px ${highlight}88`,
          }}>
            {sc.text || "FOLLOW SEKARANG"}
            <div style={{
              position: "absolute", top: 0, bottom: 0, width: 64, left: shine,
              background: "linear-gradient(100deg, transparent, rgba(255,255,255,.55), transparent)",
              transform: "skewX(-18deg)",
            }} />
          </div>
        </div>
        <span style={{ fontSize: 42, color: highlight, transform: `translateX(${bob}px)`, textShadow: `0 0 ${26}px ${highlight}` }}>→</span>
      </div>
    </AbsoluteFill>
  );
};

/* ═══════════════ KOMPOSISI ═══════════════ */

export const ViralKonten: React.FC<ViralKontenProps> = (props) => {
  const { scenes, words, highlight } = props;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const dur = viralDurationFrames(props);
  const prog = Math.min(frame / Math.max(dur - 1, 1), 1);
  const t = frame / fps;

  // scene aktif: start <= t < end (scene terakhir clamp ke ujung)
  let cur = scenes.findIndex((s) => t >= s.start && t < s.end);
  if (cur < 0) cur = scenes.length - 1;
  const sc = scenes[Math.max(cur, 0)];
  const startF = Math.round(sc.start * fps);
  const localF = frame - startF;
  const durF = Math.max(1, Math.round((sc.end - sc.start) * fps));
  const poinTotal = scenes.filter((s) => s.kind === "poin").length;
  const poinIdx = scenes.slice(0, cur).filter((s) => s.kind === "poin").length;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", width, height, fontFamily: '"Montserrat XB", sans-serif' }}>
      <Particles accent={highlight} />

      {/* SFX: whoosh di hook, pop tiap ganti scene, ding saat CTA — track audio
          komposisi (TTS voiceover tetap di-mux ffmpeg agar sync & bisa fade) */}
      <Sequence from={0}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.6} />
      </Sequence>
      {scenes.slice(1).map((s, i) => (
        <Sequence key={`sfx-${i}`} from={Math.max(0, Math.round(s.start * fps))}>
          <Audio src={staticFile(s.kind === "cta" ? "sfx/ding.wav" : "sfx/pop.wav")} volume={s.kind === "cta" ? 0.55 : 0.45} />
        </Sequence>
      ))}

      {/* Sequence → useCurrentFrame() di dalam scene = frame LOKAL scene
          (punch/flash/chip & timing karaoke akurat per scene, bukan global) */}
      <Sequence key={`sc-${cur}`} from={startF} durationInFrames={durF} name={sc.kind}>
        {sc.kind === "hook" && (
          <>
            <KenBurns img={sc.img} durF={durF} seed={0} punch />
            <Vignette strength={0.62} />
            <HookScene sc={sc} durF={durF} highlight={highlight} />
          </>
        )}
        {sc.kind === "poin" && (
          <PointScene sc={sc} idx={poinIdx} total={poinTotal} durF={durF} words={words} highlight={highlight} />
        )}
        {sc.kind === "cta" && (
          <>
            <KenBurns img={sc.img} durF={durF} seed={0} />
            <Vignette strength={0.72} />
            <CtaScene sc={sc} durF={durF} highlight={highlight} />
          </>
        )}
      </Sequence>

      {/* progress bar atas — psikologi "tinggal dikit lagi" → watch-till-end */}
      <div style={{ position: "absolute", top: 0, left: 0, height: 6, width: `${prog * 100}%`, background: highlight, opacity: 0.9 }} />
    </AbsoluteFill>
  );
};
