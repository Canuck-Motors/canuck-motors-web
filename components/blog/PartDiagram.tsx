// "Technical diagram" look for a product: red ring zoom with callout labels, on Canuck Motors black.
export type DiagramLabel = { title: string; value: string };

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const SLOTS = [
  { ax: 283, ay: 133, lx: 40, ly: 96, side: "L" as const, above: true },
  { ax: 517, ay: 133, lx: 760, ly: 96, side: "R" as const, above: true },
  { ax: 283, ay: 367, lx: 40, ly: 404, side: "L" as const, above: false },
  { ax: 517, ay: 367, lx: 760, ly: 404, side: "R" as const, above: false },
];

export default function PartDiagram({
  src,
  alt,
  labels = [],
  uid,
}: {
  src: string;
  alt: string;
  labels?: DiagramLabel[];
  uid: string;
}) {
  const full = labels.length > 0;
  const clip = `pd-clip-${uid}`;
  const glow = `pd-glow-${uid}`;
  return (
    <svg
      viewBox={full ? "0 0 800 500" : "205 55 390 390"}
      role="img"
      aria-label={alt}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="400" cy="250" r="160" />
        </clipPath>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#dc2626" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="400" cy="250" r="225" fill={`url(#${glow})`} />
      <circle cx="400" cy="250" r="192" fill="none" stroke="#dc2626" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="4 8" />
      <circle cx="400" cy="250" r="168" fill="#f4f4f5" />
      <image href={src} x="240" y="90" width="320" height="320" preserveAspectRatio="xMidYMid meet" clipPath={`url(#${clip})`} />
      <circle cx="400" cy="250" r="165" fill="none" stroke="#dc2626" strokeWidth="7" />

      {labels.slice(0, 4).map((l, i) => {
        const s = SLOTS[i];
        const mx = s.side === "L" ? 200 : 600;
        const end = s.side === "L" ? "start" : "end";
        const titleY = s.above ? s.ly - 34 : s.ly + 26;
        const valueY = s.above ? s.ly - 10 : s.ly + 50;
        return (
          <g key={i}>
            <polyline points={`${s.lx},${s.ly} ${mx},${s.ly} ${s.ax},${s.ay}`} fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5" />
            <circle cx={s.ax} cy={s.ay} r="6" fill="#dc2626" stroke="#fff" strokeWidth="2" />
            <text x={s.lx} y={titleY} textAnchor={end} fontSize="13" fontWeight="800" letterSpacing="2" fill="#f87171">
              {l.title.toUpperCase()}
            </text>
            <text x={s.lx} y={valueY} textAnchor={end} fontSize="19" fontWeight="800" fill="#fff">
              {cut(l.value, 24)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
