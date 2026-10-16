import type { ReactNode } from "react";

/** One physical layer of a part. Drawn in a 520x520 SVG space, centred on (260, 260). */
export type Layer = {
  id: string;
  label: string;
  /** Depth (px) of the layer's top face when assembled. */
  z: number;
  /** Extra depth (px) added when fully exploded. */
  ez: number;
  /** Thickness in px (drawn as stacked silhouettes). */
  thickness: number;
  /** Colour of the side walls. */
  edge: string;
  /** Silhouette path(s) used for the side walls. */
  outline: string[];
  /** SVG contents of the front face. */
  face: ReactNode;
  /** Optional SVG contents of the back face. */
  back?: ReactNode;
  /** Degrees of spin over the whole scroll (0 = static). */
  spin?: number;
};

/** Camera pose at a point in the scroll (p = 0..1). */
export type Key = { p: number; rx: number; ry: number; rz: number; s: number; e: number };

export type Chapter = {
  from: number;
  eyebrow: string;
  title: string;
  body: string;
  /** Layer ids to highlight while this chapter is active. */
  focus: string[];
};

export type ProductDef = {
  id: string;
  tab: string;
  intro: string;
  layers: Layer[];
  keys: Key[];
  chapters: Chapter[];
  cta: { label: string; href: string };
};

export const circle = (r: number, cx = 260, cy = 260) =>
  `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
