/**
 * General-purpose CSS effect library.
 * Every effect is pure CSS (keyframes included), self-contained and copy-paste ready.
 * Class names are globally unique per effect (btn-, ld-, txt-, bg-, hv-, cd-, fm- prefixes).
 */
import type { CssEffect } from "./types";

/* ------------------------------------------------------------------ */
/* BUTTONS                                                             */
/* ------------------------------------------------------------------ */

const BUTTONS: CssEffect[] = [
  {
    id: "btn-gradient-shift",
    name: "Gradient Shift",
    category: "buttons",
    description: "Gradient bergerak tanpa henti — cocok untuk CTA utama.",
    tags: ["gradient", "cta", "glow"],
    demoHtml: `<button class="btn-gradient" type="button">Go Viral</button>`,
    css: `/* Gradient Shift — animated CTA button */
.btn-gradient {
  padding: 14px 34px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  background: linear-gradient(270deg, #f59e0b, #ef4444, #ec4899, #f59e0b);
  background-size: 300% 300%;
  animation: btn-gradient-pan 4s ease infinite;
  box-shadow: 0 10px 30px rgba(239, 68, 68, 0.35);
  transition: transform 0.2s ease;
}
.btn-gradient:hover {
  transform: translateY(-2px) scale(1.03);
}
@keyframes btn-gradient-pan {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}
`,
  },
  {
    id: "btn-neon-pulse",
    name: "Neon Pulse",
    category: "buttons",
    description: "Glow hijau berdenyut ala sign neon, terang + gelap tetap terbaca.",
    tags: ["neon", "glow", "outline"],
    demoHtml: `<button class="btn-neon" type="button">Neon Button</button>`,
    css: `/* Neon Pulse — glowing outline button */
.btn-neon {
  padding: 13px 32px;
  font-weight: 700;
  font-size: 15px;
  color: #34d399;
  background: transparent;
  border: 2px solid #34d399;
  border-radius: 10px;
  cursor: pointer;
  text-shadow: 0 0 8px rgba(52, 211, 153, 0.8);
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.45), inset 0 0 12px rgba(52, 211, 153, 0.25);
  animation: btn-neon-pulse 2s ease-in-out infinite;
  transition: background 0.25s ease, color 0.25s ease;
}
.btn-neon:hover {
  background: rgba(52, 211, 153, 0.12);
  color: #6ee7b7;
}
@keyframes btn-neon-pulse {
  0%,
  100% {
    box-shadow: 0 0 8px rgba(52, 211, 153, 0.35), inset 0 0 8px rgba(52, 211, 153, 0.2);
  }
  50% {
    box-shadow: 0 0 26px rgba(52, 211, 153, 0.75), inset 0 0 18px rgba(52, 211, 153, 0.4);
  }
}
`,
  },
  {
    id: "btn-3d-press",
    name: "3D Press",
    category: "buttons",
    description: "Tombol 3D dengan hard shadow yang tertekan saat diklik.",
    tags: ["3d", "press", "shadow"],
    demoHtml: `<button class="btn-3d" type="button">Press Me</button>`,
    css: `/* 3D Press — hard-shadow button that sinks on :active */
.btn-3d {
  padding: 14px 34px;
  font-weight: 800;
  font-size: 15px;
  color: #1c1917;
  background: #fbbf24;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 6px 0 #b45309, 0 10px 18px rgba(0, 0, 0, 0.35);
  transition: transform 0.08s ease, box-shadow 0.08s ease, filter 0.15s ease;
}
.btn-3d:hover {
  filter: brightness(1.06);
}
.btn-3d:active {
  transform: translateY(6px);
  box-shadow: 0 0 0 #b45309, 0 3px 8px rgba(0, 0, 0, 0.3);
}
`,
  },
  {
    id: "btn-shine-sweep",
    name: "Shine Sweep",
    category: "buttons",
    description: "Kilau diagonal menyapu permukaan tombol secara berkala.",
    tags: ["shine", "glossy", "hover"],
    demoHtml: `<button class="btn-shine" type="button">Shine Sweep</button>`,
    css: `/* Shine Sweep — periodic diagonal glare */
.btn-shine {
  position: relative;
  overflow: hidden;
  padding: 14px 36px;
  font-weight: 700;
  font-size: 15px;
  color: #fff;
  background: #18181b;
  border: 1px solid #3f3f46;
  border-radius: 12px;
  cursor: pointer;
}
.btn-shine::after {
  content: "";
  position: absolute;
  top: -50%;
  left: -80%;
  width: 50%;
  height: 200%;
  background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transform: skewX(-20deg);
  animation: btn-shine-move 2.6s ease-in-out infinite;
}
@keyframes btn-shine-move {
  0% {
    left: -80%;
  }
  60%,
  100% {
    left: 130%;
  }
}
`,
  },
  {
    id: "btn-border-draw",
    name: "Border Draw",
    category: "buttons",
    description: "Border digambar dua arah saat hover, ringan dan elegan.",
    tags: ["border", "outline", "hover"],
    demoHtml: `<button class="btn-draw" type="button"><span>Border Draw</span></button>`,
    css: `/* Border Draw — two pseudo-elements draw the frame on hover */
.btn-draw {
  position: relative;
  padding: 15px 36px;
  font-weight: 700;
  font-size: 15px;
  color: #fde047;
  background: transparent;
  border: none;
  cursor: pointer;
}
.btn-draw::before,
.btn-draw::after {
  content: "";
  position: absolute;
  width: 0;
  height: 0;
  border: 2px solid transparent;
}
.btn-draw::before {
  top: 0;
  left: 0;
  border-top-color: #fde047;
  border-right-color: #fde047;
  transition: width 0.2s ease, height 0.2s ease 0.2s;
}
.btn-draw::after {
  bottom: 0;
  right: 0;
  border-bottom-color: #fde047;
  border-left-color: #fde047;
  transition: width 0.2s ease 0.4s, height 0.2s ease 0.6s;
}
.btn-draw:hover::before,
.btn-draw:hover::after {
  width: 100%;
  height: 100%;
}
.btn-draw span {
  position: relative;
}
`,
  },
  {
    id: "btn-jelly",
    name: "Jelly Bounce",
    category: "buttons",
    description: "Squish elastis saat hover — playful untuk audiens muda.",
    tags: ["bounce", "elastic", "hover"],
    demoHtml: `<button class="btn-jelly" type="button">Jelly!</button>`,
    css: `/* Jelly Bounce — elastic squish on hover */
.btn-jelly {
  padding: 14px 34px;
  font-weight: 800;
  font-size: 15px;
  color: #fff;
  background: #ec4899;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(236, 72, 153, 0.35);
}
.btn-jelly:hover {
  animation: btn-jelly-bounce 0.9s ease;
}
@keyframes btn-jelly-bounce {
  0% {
    transform: scale(1, 1);
  }
  25% {
    transform: scale(0.92, 1.12);
  }
  50% {
    transform: scale(1.1, 0.88);
  }
  75% {
    transform: scale(0.97, 1.04);
  }
  100% {
    transform: scale(1, 1);
  }
}
`,
  },
  {
    id: "btn-slide-fill",
    name: "Slide Fill",
    category: "buttons",
    description: "Warna isi naik dari bawah saat hover, teks ikut berubah.",
    tags: ["fill", "slide", "hover"],
    demoHtml: `<button class="btn-fill" type="button">Slide Fill</button>`,
    css: `/* Slide Fill — background slides up on hover */
.btn-fill {
  position: relative;
  padding: 14px 34px;
  font-weight: 700;
  font-size: 15px;
  color: #fde047;
  background: transparent;
  border: 2px solid #fde047;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  z-index: 0;
  transition: color 0.3s ease;
}
.btn-fill::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: #fde047;
  transform: translateY(101%);
  transition: transform 0.3s ease;
}
.btn-fill:hover {
  color: #1c1917;
}
.btn-fill:hover::before {
  transform: translateY(0);
}
`,
  },
];

/* ------------------------------------------------------------------ */
/* LOADERS                                                             */
/* ------------------------------------------------------------------ */

const LOADERS: CssEffect[] = [
  {
    id: "ld-orbit",
    name: "Orbit Spinner",
    category: "loaders",
    description: "Dua titik mengorbit — spinner klasik untuk status render.",
    tags: ["spinner", "orbit", "dots"],
    demoHtml: `<div class="ld-orbit" role="status" aria-label="Loading"></div>`,
    css: `/* Orbit Spinner — two dots orbiting the center */
.ld-orbit {
  position: relative;
  width: 64px;
  height: 64px;
  animation: ld-orbit-spin 1.6s linear infinite;
}
.ld-orbit::before,
.ld-orbit::after {
  content: "";
  position: absolute;
  left: 50%;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  border-radius: 50%;
}
.ld-orbit::before {
  top: 0;
  background: #fde047;
}
.ld-orbit::after {
  bottom: 0;
  background: #f97316;
}
@keyframes ld-orbit-spin {
  to {
    transform: rotate(360deg);
  }
}
`,
  },
  {
    id: "ld-dots-wave",
    name: "Dots Wave",
    category: "loaders",
    description: "Tiga dot melompat bergantian dengan warna berbeda.",
    tags: ["dots", "bounce", "wave"],
    demoHtml: `<div class="ld-dots" role="status" aria-label="Loading"><span></span><span></span><span></span></div>`,
    css: `/* Dots Wave — three bouncing dots */
.ld-dots {
  display: flex;
  gap: 10px;
}
.ld-dots span {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fbbf24;
  animation: ld-dots-bounce 1.2s ease-in-out infinite;
}
.ld-dots span:nth-child(2) {
  animation-delay: 0.15s;
  background: #f97316;
}
.ld-dots span:nth-child(3) {
  animation-delay: 0.3s;
  background: #ec4899;
}
@keyframes ld-dots-bounce {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  50% {
    transform: translateY(-14px);
    opacity: 1;
  }
}
`,
  },
  {
    id: "ld-conic-ring",
    name: "Conic Ring",
    category: "loaders",
    description: "Ring conic-gradient memutar — modern dan tipis.",
    tags: ["spinner", "ring", "conic"],
    demoHtml: `<div class="ld-ring" role="status" aria-label="Loading"></div>`,
    css: `/* Conic Ring — thin rotating gradient ring */
.ld-ring {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0%, #fde047 100%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
  animation: ld-ring-spin 1s linear infinite;
}
@keyframes ld-ring-spin {
  to {
    transform: rotate(360deg);
  }
}
`,
  },
  {
    id: "ld-bar-stripes",
    name: "Stripe Progress",
    category: "loaders",
    description: "Progress bar tak tentu dengan garis miring berjalan.",
    tags: ["progress", "bar", "stripes"],
    demoHtml: `<div class="ld-bar" role="progressbar" aria-label="Processing"></div>`,
    css: `/* Stripe Progress — indeterminate striped bar */
.ld-bar {
  width: 220px;
  height: 12px;
  border-radius: 999px;
  background: #27272a;
  overflow: hidden;
}
.ld-bar::before {
  content: "";
  display: block;
  height: 100%;
  width: 40%;
  border-radius: 999px;
  background: repeating-linear-gradient(45deg, #f59e0b 0 10px, #fbbf24 10px 20px);
  background-size: 28px 28px;
  animation: ld-bar-slide 1.2s ease-in-out infinite, ld-bar-stripe 0.6s linear infinite;
}
@keyframes ld-bar-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}
@keyframes ld-bar-stripe {
  to {
    background-position: 28px 0;
  }
}
`,
  },
  {
    id: "ld-square-flip",
    name: "Square Flip",
    category: "loaders",
    description: "Kubik membalik dua sumbu dengan perubahan warna.",
    tags: ["flip", "3d", "square"],
    demoHtml: `<div class="ld-flip" role="status" aria-label="Loading"></div>`,
    css: `/* Square Flip — 3D double-axis flip */
.ld-flip {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  background: #22c55e;
  animation: ld-flip-turn 1.8s cubic-bezier(0.6, 0.05, 0.35, 1) infinite;
}
@keyframes ld-flip-turn {
  0% {
    transform: perspective(160px) rotateX(0) rotateY(0);
    background: #22c55e;
  }
  50% {
    transform: perspective(160px) rotateX(-180deg) rotateY(0);
    background: #84cc16;
  }
  100% {
    transform: perspective(160px) rotateX(-180deg) rotateY(-180deg);
    background: #14b8a6;
  }
}
`,
  },
  {
    id: "ld-grid-pulse",
    name: "Grid Pulse",
    category: "loaders",
    description: "Grid 3x3 berdenyut bergelombang dari kiri ke kanan.",
    tags: ["grid", "pulse", "dots"],
    demoHtml: `<div class="ld-grid" role="status" aria-label="Loading"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>`,
    css: `/* Grid Pulse — 3x3 wave of scaling dots */
.ld-grid {
  display: grid;
  grid-template-columns: repeat(3, 16px);
  gap: 8px;
}
.ld-grid span {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  background: #e879f9;
  animation: ld-grid-pulse 1.4s ease-in-out infinite;
}
.ld-grid span:nth-child(1) { animation-delay: 0s; }
.ld-grid span:nth-child(2) { animation-delay: 0.1s; }
.ld-grid span:nth-child(3) { animation-delay: 0.2s; }
.ld-grid span:nth-child(4) { animation-delay: 0.1s; }
.ld-grid span:nth-child(5) { animation-delay: 0.2s; }
.ld-grid span:nth-child(6) { animation-delay: 0.3s; }
.ld-grid span:nth-child(7) { animation-delay: 0.2s; }
.ld-grid span:nth-child(8) { animation-delay: 0.3s; }
.ld-grid span:nth-child(9) { animation-delay: 0.4s; }
@keyframes ld-grid-pulse {
  0%,
  100% {
    opacity: 0.25;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}
`,
  },
  {
    id: "ld-pulse-ring",
    name: "Pulse Ring",
    category: "loaders",
    description: "Gelompok ring mengembang seperti radar — bagus untuk 'live'.",
    tags: ["ring", "radar", "pulse"],
    demoHtml: `<div class="ld-pulse" role="status" aria-label="Loading"></div>`,
    css: `/* Pulse Ring — radar-like expanding rings */
.ld-pulse {
  position: relative;
  width: 20px;
  height: 20px;
}
.ld-pulse::before,
.ld-pulse::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid #34d399;
  animation: ld-pulse-ring 1.8s ease-out infinite;
}
.ld-pulse::after {
  animation-delay: 0.9s;
}
@keyframes ld-pulse-ring {
  0% {
    transform: scale(0.4);
    opacity: 1;
  }
  100% {
    transform: scale(2.6);
    opacity: 0;
  }
}
`,
  },
];

/* ------------------------------------------------------------------ */
/* TEXT                                                                */
/* ------------------------------------------------------------------ */

const TEXTS: CssEffect[] = [
  {
    id: "txt-gradient-flow",
    name: "Gradient Flow",
    category: "text",
    description: "Teks gradient mengalir terus via background-clip.",
    tags: ["gradient", "headline", "background-clip"],
    demoHtml: `<h3 class="txt-gradient">GO VIRAL</h3>`,
    css: `/* Gradient Flow — animated gradient text */
.txt-gradient {
  margin: 0;
  font-family: Anton, Impact, sans-serif;
  font-size: 44px;
  letter-spacing: 1px;
  background: linear-gradient(90deg, #f97316, #ec4899, #a855f7, #f97316);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: txt-gradient-flow 4s linear infinite;
}
@keyframes txt-gradient-flow {
  to {
    background-position: 300% 0;
  }
}
`,
  },
  {
    id: "txt-typewriter",
    name: "Typewriter",
    category: "text",
    description: "Mengetik ulang terus dengan karet caret berkedip.",
    tags: ["typewriter", "typing", "caret"],
    demoHtml: `<p class="txt-type">viral captions</p>`,
    css: `/* Typewriter — infinite typing loop with blinking caret */
.txt-type {
  display: inline-block;
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 22px;
  color: #86efac;
  white-space: nowrap;
  overflow: hidden;
  border-right: 3px solid #86efac;
  width: 0;
  animation: txt-type-typing 3.2s steps(14) infinite, txt-type-caret 0.8s step-end infinite;
}
@keyframes txt-type-typing {
  0% {
    width: 0;
  }
  45%,
  80% {
    width: 14ch;
  }
  100% {
    width: 0;
  }
}
@keyframes txt-type-caret {
  0%,
  100% {
    border-color: #86efac;
  }
  50% {
    border-color: transparent;
  }
}
`,
  },
  {
    id: "txt-glitch",
    name: "Glitch",
    category: "text",
    description: "Glitch RGB klasik dengan clip-path + data-text attribute.",
    tags: ["glitch", "rgb", "clip-path"],
    demoHtml: `<span class="txt-glitch" data-text="GLITCH">GLITCH</span>`,
    css: `/* Glitch — RGB split with clip-path slices.
   Set data-text equal to the visible text. */
.txt-glitch {
  position: relative;
  font-family: Anton, Impact, sans-serif;
  font-size: 46px;
  letter-spacing: 2px;
  color: #fafafa;
}
.txt-glitch::before,
.txt-glitch::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
}
.txt-glitch::before {
  color: #f43f5e;
  clip-path: inset(0 0 55% 0);
  animation: txt-glitch-a 2.4s linear infinite alternate-reverse;
}
.txt-glitch::after {
  color: #22d3ee;
  clip-path: inset(55% 0 0 0);
  animation: txt-glitch-b 3.1s linear infinite alternate;
}
@keyframes txt-glitch-a {
  0% { transform: translate(-3px, -2px); }
  20% { transform: translate(3px, 1px); }
  40% { transform: translate(-2px, 2px); }
  60% { transform: translate(2px, -1px); }
  80% { transform: translate(-3px, 1px); }
  100% { transform: translate(2px, 2px); }
}
@keyframes txt-glitch-b {
  0% { transform: translate(3px, 2px); }
  25% { transform: translate(-3px, -1px); }
  50% { transform: translate(2px, -2px); }
  75% { transform: translate(-2px, 1px); }
  100% { transform: translate(3px, -2px); }
}
`,
  },
  {
    id: "txt-neon-flicker",
    name: "Neon Flicker",
    category: "text",
    description: "Neon kuning berkedip seperti lampu kota malam hari.",
    tags: ["neon", "flicker", "glow"],
    demoHtml: `<h3 class="txt-neon">OPEN 24/7</h3>`,
    css: `/* Neon Flicker — buzzing neon sign */
.txt-neon {
  margin: 0;
  font-family: "Bebas Neue", Impact, sans-serif;
  font-size: 48px;
  letter-spacing: 3px;
  color: #fde047;
  text-shadow: 0 0 6px rgba(253, 224, 71, 0.9), 0 0 18px rgba(253, 224, 71, 0.6), 0 0 42px rgba(253, 185, 71, 0.5);
  animation: txt-neon-flicker 3s linear infinite;
}
@keyframes txt-neon-flicker {
  0%,
  18%,
  22%,
  25%,
  53%,
  57%,
  100% {
    opacity: 1;
    text-shadow: 0 0 6px rgba(253, 224, 71, 0.9), 0 0 18px rgba(253, 224, 71, 0.6), 0 0 42px rgba(253, 185, 71, 0.5);
  }
  20%,
  24%,
  55% {
    opacity: 0.55;
    text-shadow: none;
  }
}
`,
  },
  {
    id: "txt-3d-stack",
    name: "3D Shadow Stack",
    category: "text",
    description: "Shadow bertumpuk melebar saat hover — teks jadi blok 3D.",
    tags: ["3d", "shadow", "hover"],
    demoHtml: `<h3 class="txt-3d">HOVER ME</h3>`,
    css: `/* 3D Shadow Stack — text grows a chunky 3D extrusion on hover */
.txt-3d {
  margin: 0;
  font-family: Anton, Impact, sans-serif;
  font-size: 46px;
  color: #fbbf24;
  cursor: default;
  text-shadow: 0 2px 0 #92400e;
  transition: text-shadow 0.25s ease, transform 0.25s ease;
}
.txt-3d:hover {
  transform: translate(-2px, -2px);
  text-shadow: 2px 2px 0 #92400e, 4px 4px 0 #92400e, 6px 6px 0 #92400e, 8px 8px 0 #92400e, 12px 14px 20px rgba(0, 0, 0, 0.55);
}
`,
  },
  {
    id: "txt-wave-letters",
    name: "Wave Letters",
    category: "text",
    description: "Tiap huruf melambung bergelombang dengan delay berantai.",
    tags: ["wave", "letters", "bounce"],
    demoHtml: `<div class="txt-wave" aria-label="VIRAL"><span>V</span><span>I</span><span>R</span><span>A</span><span>L</span></div>`,
    css: `/* Wave Letters — bouncing letters with chained delays */
.txt-wave {
  display: flex;
  gap: 2px;
  margin: 0;
  font-family: Anton, Impact, sans-serif;
  font-size: 44px;
  color: #f9a8d4;
}
.txt-wave span {
  display: inline-block;
  animation: txt-wave-bounce 1.6s ease-in-out infinite;
}
.txt-wave span:nth-child(1) { animation-delay: 0s; }
.txt-wave span:nth-child(2) { animation-delay: 0.12s; }
.txt-wave span:nth-child(3) { animation-delay: 0.24s; }
.txt-wave span:nth-child(4) { animation-delay: 0.36s; }
.txt-wave span:nth-child(5) { animation-delay: 0.48s; }
.txt-wave span:nth-child(6) { animation-delay: 0.6s; }
.txt-wave span:nth-child(7) { animation-delay: 0.72s; }
.txt-wave span:nth-child(8) { animation-delay: 0.84s; }
@keyframes txt-wave-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-16px);
  }
}
`,
  },
  {
    id: "txt-metal-shine",
    name: "Metal Shine",
    category: "text",
    description: "Kilap logam menyapu teks — premium look untuk judul.",
    tags: ["shine", "metal", "sweep"],
    demoHtml: `<h3 class="txt-shine">PREMIUM CLIP</h3>`,
    css: `/* Metal Shine — light sweep across gradient-clipped text */
.txt-shine {
  margin: 0;
  font-family: Anton, Impact, sans-serif;
  font-size: 46px;
  letter-spacing: 1px;
  background: linear-gradient(120deg, #a8a29e 30%, #ffffff 50%, #a8a29e 70%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: txt-shine-sweep 3s linear infinite;
}
@keyframes txt-shine-sweep {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
`,
  },
];

/* ------------------------------------------------------------------ */
/* BACKGROUNDS                                                         */
/* ------------------------------------------------------------------ */

const BACKGROUNDS: CssEffect[] = [
  {
    id: "bg-mesh-gradient",
    name: "Mesh Gradient",
    category: "backgrounds",
    description: "Mesh warna lembut berputar pelan — hero background modern.",
    tags: ["gradient", "mesh", "blur"],
    demoHtml: `<div class="bg-mesh"></div>`,
    css: `/* Mesh Gradient — slow rotating color blobs */
.bg-mesh {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #0c0a09;
}
.bg-mesh::before {
  content: "";
  position: absolute;
  inset: -40%;
  background: radial-gradient(38% 38% at 25% 30%, rgba(249, 115, 22, 0.5) 0%, transparent 100%), radial-gradient(34% 34% at 75% 25%, rgba(236, 72, 153, 0.45) 0%, transparent 100%), radial-gradient(40% 40% at 60% 75%, rgba(132, 204, 22, 0.4) 0%, transparent 100%), radial-gradient(30% 30% at 30% 80%, rgba(250, 204, 21, 0.4) 0%, transparent 100%);
  filter: blur(30px);
  animation: bg-mesh-pan 14s ease-in-out infinite alternate;
}
@keyframes bg-mesh-pan {
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(6deg) scale(1.15);
  }
  100% {
    transform: rotate(-4deg) scale(1.05);
  }
}
`,
  },
  {
    id: "bg-aurora",
    name: "Aurora",
    category: "backgrounds",
    description: "Dua blob aurora menyilang dengan blend-mode screen.",
    tags: ["aurora", "blob", "night"],
    demoHtml: `<div class="bg-aurora"></div>`,
    css: `/* Aurora — two drifting light blobs */
.bg-aurora {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(180deg, #09090b, #111113);
}
.bg-aurora::before,
.bg-aurora::after {
  content: "";
  position: absolute;
  width: 60%;
  height: 70%;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.55;
  mix-blend-mode: screen;
}
.bg-aurora::before {
  top: -20%;
  left: -10%;
  background: #10b981;
  animation: bg-aurora-a 9s ease-in-out infinite alternate;
}
.bg-aurora::after {
  bottom: -25%;
  right: -10%;
  background: #f43f5e;
  animation: bg-aurora-b 11s ease-in-out infinite alternate;
}
@keyframes bg-aurora-a {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(45%, 30%) scale(1.2);
  }
}
@keyframes bg-aurora-b {
  0% {
    transform: translate(0, 0) scale(1.1);
  }
  100% {
    transform: translate(-40%, -25%) scale(0.9);
  }
}
`,
  },
  {
    id: "bg-dot-matrix",
    name: "Dot Matrix",
    category: "backgrounds",
    description: "Polkadot berjalan diagonal — subtle untuk section gelap.",
    tags: ["dots", "pattern", "tile"],
    demoHtml: `<div class="bg-dots"></div>`,
    css: `/* Dot Matrix — endlessly scrolling polkadot */
.bg-dots {
  position: absolute;
  inset: 0;
  background-color: #0c0a09;
  background-image: radial-gradient(rgba(251, 191, 36, 0.5) 1.5px, transparent 1.6px);
  background-size: 26px 26px;
  animation: bg-dots-move 2.6s linear infinite;
}
@keyframes bg-dots-move {
  to {
    background-position: 26px 26px;
  }
}
`,
  },
  {
    id: "bg-diagonal-stripes",
    name: "Diagonal Stripes",
    category: "backgrounds",
    description: "Garis miring hazard berjalan — energik untuk banner.",
    tags: ["stripes", "diagonal", "pattern"],
    demoHtml: `<div class="bg-stripes"></div>`,
    css: `/* Diagonal Stripes — running hazard stripes */
.bg-stripes {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(45deg, #101010 0 20px, #16130c 20px 40px, rgba(250, 204, 21, 0.16) 40px 44px, #16130c 44px 64px, #101010 64px 84px);
  background-size: 119px 119px;
  animation: bg-stripes-move 3s linear infinite;
}
@keyframes bg-stripes-move {
  to {
    background-position: 119px 0;
  }
}
`,
  },
  {
    id: "bg-floating-orbs",
    name: "Floating Orbs",
    category: "backgrounds",
    description: "Lima bola blur melayang dengan kecepatan berbeda.",
    tags: ["orbs", "float", "blur"],
    demoHtml: `<div class="bg-orbs"><span></span><span></span><span></span><span></span><span></span></div>`,
    css: `/* Floating Orbs — soft glowing bubbles drifting */
.bg-orbs {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #0a0a0a;
}
.bg-orbs span {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
  opacity: 0.85;
}
.bg-orbs span:nth-child(1) {
  width: 26px;
  height: 26px;
  top: 18%;
  left: 12%;
  background: #fbbf24;
  box-shadow: 0 0 24px #fbbf24;
  animation: bg-orbs-float 7s ease-in-out infinite;
}
.bg-orbs span:nth-child(2) {
  width: 16px;
  height: 16px;
  top: 60%;
  left: 22%;
  background: #f97316;
  box-shadow: 0 0 18px #f97316;
  animation: bg-orbs-float 9s ease-in-out infinite reverse;
}
.bg-orbs span:nth-child(3) {
  width: 34px;
  height: 34px;
  top: 30%;
  right: 18%;
  background: #ec4899;
  box-shadow: 0 0 30px #ec4899;
  animation: bg-orbs-float 8s ease-in-out 1s infinite;
}
.bg-orbs span:nth-child(4) {
  width: 14px;
  height: 14px;
  bottom: 20%;
  right: 30%;
  background: #34d399;
  box-shadow: 0 0 16px #34d399;
  animation: bg-orbs-float 6s ease-in-out 0.5s infinite reverse;
}
.bg-orbs span:nth-child(5) {
  width: 20px;
  height: 20px;
  top: 12%;
  right: 40%;
  background: #e879f9;
  box-shadow: 0 0 20px #e879f9;
  animation: bg-orbs-float 10s ease-in-out 2s infinite;
}
@keyframes bg-orbs-float {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(30px, -40px);
  }
}
`,
  },
  {
    id: "bg-starfield",
    name: "Starfield",
    category: "backgrounds",
    description: "Bintang berkelip + drift lambat untuk nuansa malam.",
    tags: ["stars", "night", "twinkle"],
    demoHtml: `<div class="bg-stars"></div>`,
    css: `/* Starfield — twinkling drifting stars */
.bg-stars {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 0%, #1c1917 0%, #050505 70%);
}
.bg-stars::before,
.bg-stars::after {
  content: "";
  position: absolute;
  inset: -50% 0;
  background-image: radial-gradient(1px 1px at 25% 15%, #ffffff 50%, transparent 51%), radial-gradient(1px 1px at 60% 40%, #ffffff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 80% 20%, #fde047 50%, transparent 51%), radial-gradient(1px 1px at 40% 70%, #ffffff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 15% 55%, #ffffff 50%, transparent 51%);
  background-size: 220px 220px;
}
.bg-stars::before {
  opacity: 0.35;
  animation: bg-stars-twinkle 3s ease-in-out infinite alternate;
}
.bg-stars::after {
  background-size: 340px 340px;
  opacity: 0.7;
  animation: bg-stars-twinkle 4s ease-in-out 1s infinite alternate, bg-stars-drift 60s linear infinite;
}
@keyframes bg-stars-twinkle {
  0% {
    opacity: 0.2;
  }
  100% {
    opacity: 0.9;
  }
}
@keyframes bg-stars-drift {
  to {
    transform: translateY(-340px);
  }
}
`,
  },
];

/* ------------------------------------------------------------------ */
/* HOVER & 3D                                                          */
/* ------------------------------------------------------------------ */

const HOVER: CssEffect[] = [
  {
    id: "hv-lift-card",
    name: "Lift Card",
    category: "hover",
    description: "Kartu terangkat + border menyala saat di-hover.",
    tags: ["hover", "lift", "shadow"],
    demoHtml: `<div class="hv-lift"><h4>Lift Card</h4><p>Hover untuk mengangkat kartu.</p></div>`,
    css: `/* Lift Card — rise + glow border on hover */
.hv-lift {
  width: 210px;
  padding: 22px;
  background: #18181b;
  border: 1px solid #2e2e2e;
  border-radius: 16px;
  color: #fafafa;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.3, 1.2), box-shadow 0.3s ease, border-color 0.3s ease;
}
.hv-lift:hover {
  transform: translateY(-10px);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
  border-color: #fbbf24;
}
.hv-lift h4 {
  margin: 0 0 6px;
  font-size: 17px;
}
.hv-lift p {
  margin: 0;
  font-size: 13px;
  color: #a1a1aa;
}
`,
  },
  {
    id: "hv-tilt-3d",
    name: "Tilt 3D",
    category: "hover",
    description: "Perspektif miring ke satu arah + bayangan panjang.",
    tags: ["3d", "tilt", "perspective"],
    demoHtml: `<div class="hv-tilt">TILT</div>`,
    css: `/* Tilt 3D — perspective tilt on hover */
.hv-tilt {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 130px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: #1c1917;
  font-weight: 800;
  font-size: 20px;
  letter-spacing: 2px;
  cursor: pointer;
  transform: perspective(600px);
  transition: transform 0.35s ease, box-shadow 0.35s ease;
}
.hv-tilt:hover {
  transform: perspective(600px) rotateX(12deg) rotateY(-14deg) scale(1.04);
  box-shadow: -18px 22px 34px rgba(0, 0, 0, 0.4);
}
`,
  },
  {
    id: "hv-image-zoom",
    name: "Image Zoom Reveal",
    category: "hover",
    description: "Gambar zoom + caption slide-up dari bawah.",
    tags: ["image", "zoom", "caption"],
    demoHtml: `<figure class="hv-zoom"><img src="/demo-street.png" alt="Street interview clip" /><figcaption class="hv-zoom-cap">Street Interview · 00:24</figcaption></figure>`,
    css: `/* Image Zoom Reveal — zoom + caption slide-up */
.hv-zoom {
  position: relative;
  width: 230px;
  height: 150px;
  margin: 0;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
}
.hv-zoom img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.2, 0.7, 0.3, 1);
}
.hv-zoom:hover img {
  transform: scale(1.15) rotate(1deg);
}
.hv-zoom-cap {
  position: absolute;
  inset: auto 0 0 0;
  padding: 12px 14px;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
  transform: translateY(100%);
  transition: transform 0.35s ease;
}
.hv-zoom:hover .hv-zoom-cap {
  transform: translateY(0);
}
`,
  },
  {
    id: "hv-underline-grow",
    name: "Underline Grow",
    category: "hover",
    description: "Garis bawah gradient tumbuh dari kiri saat hover.",
    tags: ["underline", "link", "gradient"],
    demoHtml: `<span class="hv-underline" role="link" tabindex="0">Hover underline</span>`,
    css: `/* Underline Grow — gradient underline sweeps in */
.hv-underline {
  position: relative;
  padding-bottom: 6px;
  font-size: 26px;
  font-weight: 800;
  color: #fafafa;
  cursor: pointer;
}
.hv-underline::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, #f97316, #ec4899);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.35s cubic-bezier(0.6, 0, 0.3, 1);
}
.hv-underline:hover::after,
.hv-underline:focus-visible::after {
  transform: scaleX(1);
}
`,
  },
  {
    id: "hv-glow-border",
    name: "Glow Border",
    category: "hover",
    description: "Cahaya conic berputar mengelilingi kartu saat hover.",
    tags: ["glow", "border", "conic"],
    demoHtml: `<div class="hv-glow">GLOW BORDER</div>`,
    css: `/* Glow Border — rotating conic light on hover */
.hv-glow {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 210px;
  height: 130px;
  border-radius: 16px;
  background: #131313;
  color: #e4e4e7;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  overflow: hidden;
  z-index: 0;
}
.hv-glow::before {
  content: "";
  position: absolute;
  inset: -60%;
  z-index: -2;
  background: conic-gradient(from 0deg, transparent 0 55%, #fbbf24 70%, #ef4444 85%, transparent 100%);
  opacity: 0;
  animation: hv-glow-spin 2.2s linear infinite;
  transition: opacity 0.3s ease;
}
.hv-glow::after {
  content: "";
  position: absolute;
  inset: 2px;
  z-index: -1;
  border-radius: 14px;
  background: #131313;
}
.hv-glow:hover::before {
  opacity: 1;
}
@keyframes hv-glow-spin {
  to {
    transform: rotate(360deg);
  }
}
`,
  },
  {
    id: "hv-flip-card",
    name: "Flip Card",
    category: "hover",
    description: "Kartu flip 3D dua sisi dengan preserve-3d.",
    tags: ["3d", "flip", "card"],
    demoHtml: `<div class="hv-flip"><div class="hv-flip-inner"><div class="hv-flip-face hv-flip-front">9:16 CLIP</div><div class="hv-flip-face hv-flip-back">Karaoke caption ready</div></div></div>`,
    css: `/* Flip Card — two-sided 3D flip on hover */
.hv-flip {
  width: 210px;
  height: 140px;
  perspective: 800px;
  cursor: pointer;
}
.hv-flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0.1, 0.2, 1);
}
.hv-flip:hover .hv-flip-inner {
  transform: rotateY(180deg);
}
.hv-flip-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  font-weight: 800;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.hv-flip-front {
  background: linear-gradient(135deg, #22c55e, #84cc16);
  color: #052e16;
}
.hv-flip-back {
  background: #131313;
  border: 1px solid #2e2e2e;
  color: #fafafa;
  transform: rotateY(180deg);
}
`,
  },
];

/* ------------------------------------------------------------------ */
/* CARDS & PANELS                                                      */
/* ------------------------------------------------------------------ */

const CARDS: CssEffect[] = [
  {
    id: "cd-glassmorphism",
    name: "Glassmorphism",
    category: "cards",
    description: "Kaca buram dengan backdrop-filter di atas gradient.",
    tags: ["glass", "blur", "frosted"],
    demoHtml: `<div class="cd-glass-scene"><div class="cd-glass"><h4>Glass Card</h4><p>backdrop-filter: blur(14px) di atas gradient cerah.</p></div></div>`,
    css: `/* Glassmorphism — frosted glass panel.
   Needs a colorful backdrop behind it. */
.cd-glass-scene {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #7c3aed 100%);
}
.cd-glass {
  width: 240px;
  padding: 24px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
  color: #fafafa;
}
.cd-glass h4 {
  margin: 0 0 8px;
  font-size: 17px;
}
.cd-glass p {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}
`,
  },
  {
    id: "cd-gradient-border",
    name: "Animated Gradient Border",
    category: "cards",
    description: "Border conic berputar tanpa henti di sekeliling kartu.",
    tags: ["border", "gradient", "conic"],
    demoHtml: `<div class="cd-gborder-wrap"><div class="cd-gborder"><h4>Gradient Border</h4><p>Warna mengalir keliling kartu.</p></div></div>`,
    css: `/* Animated Gradient Border — spinning conic frame.
   Outer wrapper clips the rotating gradient; inner card sits on top. */
.cd-gborder-wrap {
  position: relative;
  width: 240px;
  padding: 2px;
  border-radius: 20px;
  overflow: hidden;
}
.cd-gborder-wrap::before {
  content: "";
  position: absolute;
  inset: -60%;
  background: conic-gradient(#f59e0b, #ef4444, #ec4899, #a855f7, #f59e0b);
  animation: cd-gborder-spin 3.5s linear infinite;
}
.cd-gborder {
  position: relative;
  padding: 24px;
  border-radius: 18px;
  background: #131313;
  color: #fafafa;
}
.cd-gborder h4 {
  margin: 0 0 8px;
  font-size: 17px;
}
.cd-gborder p {
  margin: 0;
  font-size: 13px;
  color: #a1a1aa;
}
@keyframes cd-gborder-spin {
  to {
    transform: rotate(1turn);
  }
}
`,
  },
  {
    id: "cd-neumorphic",
    name: "Neumorphic",
    category: "cards",
    description: "Soft UI timbul dua arah di atas permukaan terang.",
    tags: ["neumorphism", "soft-ui", "light"],
    demoHtml: `<div class="cd-neu-scene"><div class="cd-neu"><h4>Neu Card</h4><p>Soft shadow ganda: gelap + terang.</p></div></div>`,
    css: `/* Neumorphic — extruded soft-UI panel on a light surface */
.cd-neu-scene {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e0e5ec;
}
.cd-neu {
  width: 220px;
  padding: 26px;
  border-radius: 24px;
  background: #e0e5ec;
  box-shadow: 10px 10px 24px #bec3c9, -10px -10px 24px #ffffff;
  color: #64748b;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}
.cd-neu:hover {
  transform: translateY(-4px);
  box-shadow: 14px 14px 30px #bec3c9, -14px -14px 30px #ffffff;
}
.cd-neu h4 {
  margin: 0 0 8px;
  font-size: 17px;
  color: #334155;
}
.cd-neu p {
  margin: 0;
  font-size: 13px;
}
`,
  },
  {
    id: "cd-spotlight",
    name: "Spotlight Hover",
    category: "cards",
    description: "Sorotan radial muncul dari atas kartu saat hover.",
    tags: ["spotlight", "radial", "hover"],
    demoHtml: `<div class="cd-spot"><h4>Spotlight</h4><p>Hover untuk menyalakan sorotan.</p></div>`,
    css: `/* Spotlight Hover — radial light fades in from the top */
.cd-spot {
  position: relative;
  width: 240px;
  padding: 26px;
  border-radius: 18px;
  background: #17161a;
  border: 1px solid #26262b;
  color: #e4e4e7;
  overflow: hidden;
  cursor: pointer;
}
.cd-spot::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(240px circle at 50% 0%, rgba(251, 191, 36, 0.22), transparent 65%);
  opacity: 0;
  transition: opacity 0.35s ease;
}
.cd-spot:hover {
  border-color: rgba(251, 191, 36, 0.45);
}
.cd-spot:hover::before {
  opacity: 1;
}
.cd-spot h4 {
  position: relative;
  margin: 0 0 8px;
  font-size: 17px;
}
.cd-spot p {
  position: relative;
  margin: 0;
  font-size: 13px;
  color: #a1a1aa;
}
`,
  },
];

/* ------------------------------------------------------------------ */
/* FORM CONTROLS                                                       */
/* ------------------------------------------------------------------ */

const FORMS: CssEffect[] = [
  {
    id: "fm-toggle-switch",
    name: "Toggle Switch",
    category: "forms",
    description: "Switch iOS-style dengan spring easing saat berpindah.",
    tags: ["switch", "toggle", "input"],
    demoHtml: `<label class="fm-switch"><input type="checkbox" checked aria-label="Auto captions" /><span class="fm-track"></span></label>`,
    css: `/* Toggle Switch — springy iOS-style switch */
.fm-switch {
  position: relative;
  display: inline-block;
  width: 64px;
  height: 34px;
}
.fm-switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.fm-switch .fm-track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: #3f3f46;
  cursor: pointer;
  transition: background 0.3s ease;
}
.fm-switch .fm-track::before {
  content: "";
  position: absolute;
  top: 4px;
  left: 4px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  transition: transform 0.3s cubic-bezier(0.3, 1.4, 0.6, 1);
}
.fm-switch input:checked + .fm-track {
  background: #22c55e;
}
.fm-switch input:checked + .fm-track::before {
  transform: translateX(30px);
}
.fm-switch input:focus-visible + .fm-track {
  outline: 2px solid #fbbf24;
  outline-offset: 2px;
}
`,
  },
  {
    id: "fm-checkbox-draw",
    name: "Checkbox Draw",
    category: "forms",
    description: "Centang SVG digambar dengan stroke-dashoffset animasi.",
    tags: ["checkbox", "svg", "draw"],
    demoHtml: `<label class="fm-check"><input type="checkbox" checked aria-label="Add watermark" /><span class="fm-box"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" /></svg></span>Add watermark</label>`,
    css: `/* Checkbox Draw — SVG checkmark draws itself */
.fm-check {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #e4e4e7;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}
.fm-check input {
  position: absolute;
  opacity: 0;
}
.fm-check .fm-box {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 2px solid #52525b;
  background: transparent;
  transition: background 0.25s ease, border-color 0.25s ease;
}
.fm-check .fm-box svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: #1c1917;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  transition: stroke-dashoffset 0.3s ease 0.05s;
}
.fm-check input:checked + .fm-box {
  background: #fbbf24;
  border-color: #fbbf24;
}
.fm-check input:checked + .fm-box svg {
  stroke-dashoffset: 0;
}
.fm-check input:focus-visible + .fm-box {
  outline: 2px solid #fbbf24;
  outline-offset: 2px;
}
`,
  },
  {
    id: "fm-input-glow",
    name: "Input Focus Glow",
    category: "forms",
    description: "Border + halo glow menyala saat input fokus.",
    tags: ["input", "focus", "glow"],
    demoHtml: `<div class="fm-field"><input type="text" placeholder="Paste video URL…" aria-label="Video URL" /></div>`,
    css: `/* Input Focus Glow — glowing focus ring */
.fm-field {
  width: 240px;
}
.fm-field input {
  width: 100%;
  padding: 14px 16px;
  font-size: 15px;
  border-radius: 12px;
  background: #131313;
  border: 2px solid #3f3f46;
  color: #fafafa;
  outline: none;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.fm-field input::placeholder {
  color: #71717a;
}
.fm-field input:hover {
  border-color: #52525b;
}
.fm-field input:focus {
  border-color: #fbbf24;
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.18), 0 0 24px rgba(251, 191, 36, 0.12);
}
`,
  },
  {
    id: "fm-radio-pop",
    name: "Radio Pop",
    category: "forms",
    description: "Dot radio melepop dengan easing elastis.",
    tags: ["radio", "dot", "elastic"],
    demoHtml: `<div style="display:flex; gap:22px;"><label class="fm-radio"><input type="radio" name="fm-ratio-demo" checked aria-label="Vertical 9:16" /><span class="fm-dot"></span>9:16</label><label class="fm-radio"><input type="radio" name="fm-ratio-demo" aria-label="Horizontal 16:9" /><span class="fm-dot"></span>16:9</label></div>`,
    css: `/* Radio Pop — elastic radio dot */
.fm-radio {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #e4e4e7;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}
.fm-radio input {
  position: absolute;
  opacity: 0;
}
.fm-radio .fm-dot {
  position: relative;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #52525b;
  transition: border-color 0.25s ease;
}
.fm-radio .fm-dot::after {
  content: "";
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: #f97316;
  transform: scale(0);
  transition: transform 0.25s cubic-bezier(0.3, 1.5, 0.6, 1);
}
.fm-radio input:checked + .fm-dot {
  border-color: #f97316;
}
.fm-radio input:checked + .fm-dot::after {
  transform: scale(1);
}
.fm-radio input:focus-visible + .fm-dot {
  outline: 2px solid #fbbf24;
  outline-offset: 2px;
}
`,
  },
];

export const LIBRARY_EFFECTS: CssEffect[] = [
  ...BUTTONS,
  ...LOADERS,
  ...TEXTS,
  ...BACKGROUNDS,
  ...HOVER,
  ...CARDS,
  ...FORMS,
];
