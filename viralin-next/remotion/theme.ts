/** Theme tunggal Motion Studio — sumber kebenaran warna, easing, spring, font.
 *  Ikuti skill remotion-motion-graphics: JANGAN inline hex, easing, atau
 *  spring config di komponen. Semua komponen Remotion harus import dari sini.
 *  Warna per-tema (hijau/biru/oranye/pink) tetap di lib/motion.ts (PALETTES)
 *  karena file itu dipakai client + server TANPA import "remotion".
 *  Di sini hanya warna netral + easing/spring yang dipakai semua tema. */
import { Easing } from "remotion";

export const MOTION_THEME = {
  colors: {
    gold: "#fbbf24",
    goldDark: "#b45309",
    rose: "#fb7185",
    red: "#ef4444",
    white: "#ffffff",
    ink: "#0b0b0b",
  },
  fonts: {
    display: '"Montserrat XB", "Montserrat ExtraBold", sans-serif',
    caption: '"Anton VB", "Anton", Impact, sans-serif',
  },
  ease: {
    /** easeOutExpo — entrance */
    out: Easing.bezier(0.16, 1, 0.3, 1),
    /** easeInOutQuint — gerakan, Ken Burns */
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    /** exit saja */
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    /** pop kata / UI */
    snappy: { damping: 12, stiffness: 170, mass: 0.45 },
    /** elemen besar */
    smooth: { damping: 13, stiffness: 150, mass: 0.55 },
    /** aksen / logo */
    bouncy: { damping: 10, stiffness: 160, mass: 0.5 },
  },
} as const;
