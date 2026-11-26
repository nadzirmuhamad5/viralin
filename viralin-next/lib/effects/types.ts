export type EffectCategory = {
  id: string;
  name: string;
  tagline: string;
  accent: string;
};

export type CssEffect = {
  /** unique slug, also used as css class prefix */
  id: string;
  name: string;
  /** category id */
  category: string;
  /** sub group, e.g. "Hormozi" for caption presets */
  group?: string;
  description: string;
  tags: string[];
  /** inner html rendered inside the demo stage */
  demoHtml: string;
  /** complete, self-contained css (what the user copies) */
  css: string;
  /** dialog renders a 9:16 phone frame instead of a wide stage */
  tall?: boolean;
};
