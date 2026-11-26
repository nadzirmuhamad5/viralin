import type { CssEffect, EffectCategory } from "./types";
import { CAPTION_EFFECTS } from "./captions";
import { LIBRARY_EFFECTS } from "./library";

export type { CssEffect, EffectCategory };

export const CATEGORIES: EffectCategory[] = [
  {
    id: "captions",
    name: "Caption Karaoke",
    tagline: "30 preset caption Viralin — ported 1:1 dari lib/captions.ts (ASS word-level ke CSS murni)",
    accent: "#FFD400",
  },
  {
    id: "buttons",
    name: "Buttons",
    tagline: "Tombol CTA yang siap menaikkan klik",
    accent: "#22C55E",
  },
  {
    id: "loaders",
    name: "Loaders",
    tagline: "Spinner & progress untuk status render",
    accent: "#F97316",
  },
  {
    id: "text",
    name: "Text Effects",
    tagline: "Judul dan headline yang menarik mata",
    accent: "#EC4899",
  },
  {
    id: "backgrounds",
    name: "Backgrounds",
    tagline: "Animasi background 100% CSS",
    accent: "#14B8A6",
  },
  {
    id: "hover",
    name: "Hover & 3D",
    tagline: "Interaksi hover, tilt, flip, dan glow",
    accent: "#A855F7",
  },
  {
    id: "cards",
    name: "Cards & Panels",
    tagline: "Kontainer modern: glass, gradient, neumorphic",
    accent: "#F43F5E",
  },
  {
    id: "forms",
    name: "Form Controls",
    tagline: "Toggle, checkbox, input, dan radio",
    accent: "#84CC16",
  },
];

/** All effects, captions first (the heart of the viralin port). */
export const ALL_EFFECTS: CssEffect[] = [...CAPTION_EFFECTS, ...LIBRARY_EFFECTS];

export function countByCategory(effects: CssEffect[]): Record<string, number> {
  return effects.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1;
    return acc;
  }, {});
}
