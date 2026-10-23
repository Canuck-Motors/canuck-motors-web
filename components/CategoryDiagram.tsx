// Small animated diagrams that show how each part works.
// CSS-only motion (see "diagram motion" in globals.css); static when the
// visitor prefers reduced motion. Decorative, so hidden from screen readers.
import type { CSSProperties } from "react";

const at = (x: number, y: number): CSSProperties =>
  ({ "--cx": `${x}px`, "--cy": `${y}px` }) as CSSProperties;

function Teeth({ x, y, r, n, cls }: { x: number; y: number; r: number; n: number; cls: string }) {
  return (
    <g className={cls} style={at(x, y)}>
      {Array.from({ length: n }).map((_, i) => (
        <rect
          key={i}
          x={x - 2}
          y={y - r - 3}
          width="4"
          height="6"
          rx="1"
          className="fill-white"
          transform={`rotate(${(360 / n) * i} ${x} ${y})`}
        />
      ))}
      <circle cx={x} cy={y} r={r} className="fill-white" />
      <circle cx={x} cy={y} r={r * 0.45} className="fill-ink" />
      <circle cx={x} cy={y} r={r * 0.2} className="fill-brand" />
    </g>
  );
}

function WaterPump() {
  return (
    <>
      {/* inlet and outlet pipes with coolant flowing */}
      <path d="M6 44H50M6 56H50M74 20V4M86 20V4" className="stroke-white/35" strokeWidth="2" fill="none" />
      <path d="M8 50H50" className="cm-d-flow stroke-brand" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M80 20V4" className="cm-d-flow-up stroke-brand" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* housing */}
      <circle cx="80" cy="50" r="30" className="fill-white/5 stroke-white" strokeWidth="2.5" />
      {/* impeller */}
      <g className="cm-d-spin" style={at(80, 50)}>
        {Array.from({ length: 6 }).map((_, k) => (
          <path
            key={k}
            d="M80 50Q93 43 104 48"
            className="stroke-white"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            transform={`rotate(${k * 60} 80 50)`}
          />
        ))}
        <circle cx="80" cy="50" r="6" className="fill-brand" />
      </g>
      {/* pulley driven by the belt */}
      <circle cx="134" cy="50" r="13" className="fill-white/5 stroke-white/60" strokeWidth="2" />
      <g className="cm-d-spin" style={at(134, 50)}>
        <path d="M134 40V60M124 50H144" className="stroke-white/70" strokeWidth="2" />
        <circle cx="134" cy="50" r="3" className="fill-brand" />
      </g>
      <path d="M92 38 120 40M92 62 120 60" className="stroke-white/30" strokeWidth="2" strokeDasharray="3 4" fill="none" />
    </>
  );
}

function BrakePad() {
  return (
    <>
      {/* rotor spinning */}
      <circle cx="70" cy="50" r="34" className="fill-white/5 stroke-white" strokeWidth="2.5" />
      <g className="cm-d-spin-slow" style={at(70, 50)}>
        <circle cx="70" cy="50" r="10" className="fill-white/15 stroke-white/60" strokeWidth="2" />
        {Array.from({ length: 8 }).map((_, i) => (
          <circle
            key={i}
            cx="70"
            cy="27"
            r="3.2"
            className="fill-ink stroke-white/60"
            strokeWidth="1"
            transform={`rotate(${i * 45} 70 50)`}
          />
        ))}
        <circle cx="70" cy="50" r="3" className="fill-brand" />
      </g>
      {/* caliper holding the pad, squeezing the rotor */}
      <path d="M110 28h28a4 4 0 0 1 4 4v36a4 4 0 0 1-4 4h-28" className="stroke-brand" strokeWidth="3" fill="none" />
      <rect x="98" y="34" width="9" height="32" rx="2" className="cm-d-squeeze fill-white" />
      <rect x="112" y="34" width="9" height="32" rx="2" className="fill-white/25" />
    </>
  );
}

function TimingBelt() {
  return (
    <>
      {/* belt */}
      <path
        d="M45 28H115A22 22 0 0 1 115 72H45A22 22 0 0 1 45 28Z"
        className="cm-d-belt stroke-brand"
        strokeWidth="4"
        fill="none"
      />
      <Teeth x={45} y={50} r={15} n={12} cls="cm-d-spin" />
      <Teeth x={115} y={50} r={15} n={12} cls="cm-d-spin" />
      {/* water pump driven by the belt */}
      <circle cx="80" cy="50" r="11" className="fill-white/10 stroke-white" strokeWidth="2" />
      <g className="cm-d-spin" style={at(80, 50)}>
        {Array.from({ length: 4 }).map((_, k) => (
          <path
            key={k}
            d="M80 50Q86 46 91 49"
            className="stroke-white"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            transform={`rotate(${k * 90} 80 50)`}
          />
        ))}
        <circle cx="80" cy="50" r="2.5" className="fill-brand" />
      </g>
    </>
  );
}

function BrakeShoe() {
  return (
    <>
      {/* drum */}
      <circle cx="80" cy="50" r="36" className="fill-white/5 stroke-white" strokeWidth="2.5" />
      {/* hub with lug holes, spinning */}
      <g className="cm-d-spin-slow" style={at(80, 50)}>
        <circle cx="80" cy="50" r="9" className="fill-white/15 stroke-white/60" strokeWidth="2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <circle
            key={i}
            cx="80"
            cy="44"
            r="1.8"
            className="fill-white"
            transform={`rotate(${i * 72} 80 50)`}
          />
        ))}
      </g>
      {/* two shoes pressing outward against the drum */}
      <g className="cm-d-expand" style={at(80, 50)}>
        <path d="M60.300 36.200A24 24 0 0 0 60.300 63.800" className="stroke-brand" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M99.700 36.200A24 24 0 0 1 99.700 63.800" className="stroke-brand" strokeWidth="7" strokeLinecap="round" fill="none" />
      </g>
      {/* wheel cylinder and spring */}
      <rect x="73" y="22" width="14" height="8" rx="2" className="fill-white" />
      <path d="M62 66Q80 74 98 66" className="stroke-white/50" strokeWidth="1.500" strokeDasharray="2 2" fill="none" />
    </>
  );
}

export default function CategoryDiagram({ name }: { name: string }) {
  const n = name.toLowerCase();
  const art = n.includes("timing")
    ? <TimingBelt />
    : n.includes("water pump")
      ? <WaterPump />
      : n.includes("brake pad")
        ? <BrakePad />
        : n.includes("shoe")
          ? <BrakeShoe />
          : null;

  if (!art) return null;

  return (
    <svg viewBox="0 0 150 100" className="h-28 w-full max-w-[210px] overflow-visible" aria-hidden="true">
      {art}
    </svg>
  );
}
