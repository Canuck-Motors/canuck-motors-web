import type { ProductDef } from "./types";

// Pad shapes (520x520 space). The pad is a gently curved "kidney" with two mounting ears.
const PLATE = "M70 215 Q260 160 450 215 L462 262 Q470 318 430 348 Q260 398 90 348 Q50 318 58 262 Z";
const EAR_L = "M60 230 L30 234 Q18 236 18 250 L18 282 Q18 296 32 296 L66 298 Z";
const EAR_R = "M460 230 L490 234 Q502 236 502 250 L502 282 Q502 296 488 296 L454 298 Z";
const SHIM = "M78 219 Q260 167 442 219 L453 262 Q460 314 424 342 Q260 390 96 342 Q60 314 67 262 Z";
const UNDER = "M90 219 Q260 173 430 219 L442 262 Q448 314 414 338 Q260 384 106 338 Q72 314 78 262 Z";
const FRICTION = "M98 223 Q260 179 422 223 L434 262 Q440 310 408 333 Q260 377 112 333 Q80 310 86 262 Z";

const tex = (name: string) => (
  <image href={`/about/brakepad/${name}.webp`} x="0" y="0" width="520" height="520" preserveAspectRatio="none" />
);

const friction = tex("friction");
const under = tex("under");
const plate = tex("plate");
const shimFront = tex("shimFront");
const shimBack = tex("shimBack");

export const brakePad: ProductDef = {
  id: "brake-pads",
  tab: "Brake Pads",
  intro:
    "A brake pad looks simple, but every stop depends on what is inside it. Scroll to take a CM ceramic brake pad apart, layer by layer, and see how each part does its job.",
  layers: [
    { id: "shim", label: "Noise shim", z: 0, ez: -150, thickness: 4, edge: "#1a1a1d", outline: [SHIM], face: shimFront, back: shimBack },
    { id: "plate", label: "Steel backing plate", z: 12, ez: -50, thickness: 10, edge: "#9aa0a8", outline: [PLATE, EAR_L, EAR_R], face: plate },
    { id: "under", label: "Underlayer", z: 18, ez: 50, thickness: 6, edge: "#4a3a30", outline: [UNDER], face: under },
    { id: "friction", label: "Ceramic compound", z: 44, ez: 160, thickness: 26, edge: "#2a2a2e", outline: [FRICTION], face: friction },
  ],
  keys: [
    { p: 0, rx: 72, ry: 0, rz: -50, s: 0.575, e: 0 },
    { p: 0.12, rx: 56, ry: 0, rz: -22, s: 1.15, e: 0 },
    { p: 0.3, rx: 62, ry: 0, rz: -28, s: 1.058, e: 1 },
    { p: 0.46, rx: 50, ry: -8, rz: -16, s: 1.15, e: 1 },
    { p: 0.62, rx: 64, ry: 8, rz: -32, s: 1.058, e: 1 },
    { p: 0.76, rx: 58, ry: 18, rz: -24, s: 1.058, e: 1 },
    { p: 0.9, rx: 18, ry: 180, rz: 0, s: 1.208, e: 0.12 },
    { p: 1, rx: 8, ry: 180, rz: 0, s: 1.265, e: 0 },
  ],
  chapters: [
    {
      from: 0,
      eyebrow: "CM Ceramic Brake Pads",
      title: "Engineered to stop. Built to last.",
      body: "Made to OE fit for a wide range of cars and trucks, and boxed with the hardware you need to install them.",
      focus: [],
    },
    {
      from: 0.2,
      eyebrow: "Exploded view",
      title: "Four layers. One job.",
      body: "Every CM pad is a stack of parts that work together: friction compound, underlayer, steel backing plate and noise shim.",
      focus: [],
    },
    {
      from: 0.38,
      eyebrow: "Friction compound",
      title: "Ceramic formula for clean, quiet stops.",
      body: "A ceramic compound for smooth, consistent braking with less dust. The centre slot and angled chamfers help vent heat and reduce noise.",
      focus: ["friction", "under"],
    },
    {
      from: 0.54,
      eyebrow: "Backing plate",
      title: "A steel spine that stays flat.",
      body: "A rigid steel backing plate spreads caliper force evenly across the pad, so it wears evenly under load.",
      focus: ["plate"],
    },
    {
      from: 0.69,
      eyebrow: "Noise shim",
      title: "Cuts vibration before it becomes squeal.",
      body: "The shim sits between the pad and the caliper piston and absorbs the vibration that causes brake squeal.",
      focus: ["shim"],
    },
    {
      from: 0.84,
      eyebrow: "The CM mark",
      title: "Every pad carries our name.",
      body: "Checked for fit and finish before it ships, and backed by Canuck Motors.",
      focus: [],
    },
  ],
  cta: { label: "Shop brake pads", href: "/categories" },
};
