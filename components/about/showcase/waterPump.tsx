import { circle, type ProductDef } from "./types";

const C = 260;
const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};

// Housing: round body, three bolt bosses and an inlet neck.
const EARS = [-90, 30, 150].map((d) => polar(146, d));
const EAR_PATHS = EARS.map(([x, y]) => circle(28, x, y));
const NECK = "M370 232 L478 232 Q490 232 490 244 L490 276 Q490 288 478 288 L370 288 Z";
const HOUSING_OUTLINE = [circle(136), ...EAR_PATHS, NECK];

const tex = (name: string) => (
  <image href={`/about/waterpump/${name}.webp`} x="0" y="0" width="520" height="520" preserveAspectRatio="none" />
);

const pulley = tex("pulley");
const bearing = tex("bearing");
const housing = tex("housing");
const seal = tex("seal");
const gasket = tex("gasket");
const impeller = tex("impeller");

export const waterPump: ProductDef = {
  id: "water-pumps",
  tab: "Water Pumps",
  intro:
    "Your water pump moves coolant through the engine thousands of times every drive. Scroll to take a CM water pump apart and see what keeps it running cool, quiet and leak-free.",
  layers: [
    { id: "impeller", label: "Impeller", z: -64, ez: -250, thickness: 18, edge: "#4a4f56", outline: [circle(96)], face: impeller, spin: 1080 },
    { id: "gasket", label: "Gasket", z: -46, ez: -150, thickness: 2, edge: "#111113", outline: [`${circle(150)} ${circle(124)}`], face: gasket },
    { id: "seal", label: "Seal", z: -28, ez: -80, thickness: 8, edge: "#08080a", outline: [circle(44)], face: seal },
    { id: "housing", label: "Housing", z: 0, ez: 0, thickness: 40, edge: "#8a8f95", outline: HOUSING_OUTLINE, face: housing },
    { id: "bearing", label: "Bearing", z: 34, ez: 110, thickness: 30, edge: "#7b8188", outline: [circle(62)], face: bearing, spin: 360 },
    { id: "pulley", label: "Pulley flange", z: 54, ez: 210, thickness: 14, edge: "#6c727a", outline: [circle(105)], face: pulley, spin: 720 },
  ],
  keys: [
    { p: 0, rx: 14, ry: 20, rz: 0, s: 0.675, e: 0 },
    { p: 0.12, rx: 12, ry: -28, rz: 0, s: 1.35, e: 0 },
    { p: 0.3, rx: 10, ry: -62, rz: 0, s: 1.053, e: 1 },
    { p: 0.46, rx: 14, ry: -48, rz: 0, s: 1.107, e: 1 },
    { p: 0.62, rx: 8, ry: -66, rz: 0, s: 1.08, e: 1 },
    { p: 0.76, rx: 16, ry: -38, rz: 0, s: 1.134, e: 1 },
    { p: 0.92, rx: 6, ry: -8, rz: 0, s: 1.35, e: 0.1 },
    { p: 1, rx: 0, ry: 0, rz: 0, s: 1.418, e: 0 },
  ],
  chapters: [
    {
      from: 0,
      eyebrow: "CM Water Pumps",
      title: "Keeps your engine at the right temperature.",
      body: "Designed, built and tested to meet or exceed original equipment specifications.",
      focus: [],
    },
    {
      from: 0.2,
      eyebrow: "Exploded view",
      title: "Six parts, built to work as one.",
      body: "Pulley flange, bearing, housing, seal, gasket and impeller. Each one is engineered for a precise OE fit.",
      focus: [],
    },
    {
      from: 0.38,
      eyebrow: "High-performance impeller",
      title: "Engineered for optimal coolant flow.",
      body: "Tight tolerances keep coolant moving efficiently, so the engine runs at its ideal temperature with less wear.",
      focus: ["impeller"],
    },
    {
      from: 0.54,
      eyebrow: "Bearing & seal",
      title: "Smooth, quiet, sealed tight.",
      body: "Heat-treated bearings run smoothly at high speed with low vibration, and advanced seals keep coolant in and contamination out.",
      focus: ["bearing", "seal"],
    },
    {
      from: 0.69,
      eyebrow: "Robust housing",
      title: "Strong, leak-proof and corrosion resistant.",
      body: "A high-strength housing with a precision gasket face resists leaks, rust and heat for a long service life.",
      focus: ["housing", "gasket"],
    },
    {
      from: 0.84,
      eyebrow: "The CM mark",
      title: "Ready to install. Built to last.",
      body: "OE fit for a wide range of makes and models, from compact cars to heavy-duty trucks.",
      focus: [],
    },
  ],
  cta: { label: "Shop water pumps", href: "/categories" },
};
