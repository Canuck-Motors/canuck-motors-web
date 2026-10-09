// A red sports car driving on a moving road, with spinning wheels.
// CSS-only (classes live in globals.css: .cm-driving / .cm-wheel / .cm-road / .cm-car).
export default function RoadLoader({
  label = "Finding your parts",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <svg viewBox="0 0 140 56" className="cm-driving h-24 w-56 overflow-visible" aria-hidden="true">
        {/* road */}
        <rect x="0" y="45" width="140" height="3" rx="1.5" className="fill-ink/10" />
        <g className="cm-road-wide stroke-ink/30">
          <path
            d="M0 52h10M20 52h10M40 52h10M60 52h10M80 52h10M100 52h10M120 52h10M140 52h10"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* speed lines */}
        <g className="cm-road-wide stroke-brand/40" strokeWidth="1.6" strokeLinecap="round">
          <path d="M2 24h16M0 31h12M6 38h14" />
        </g>

        <g className="cm-car">
          {/* low sports body */}
          <path
            d="M24 38c-3 0-5-1.5-5-4v-3c0-1.6 1-2.8 2.600-3.200l18-4.600 14-8.600C56 14 58 13.400 60 13.400h18c2.500 0 4.600 1 6.200 2.800l8.400 9.200 14.800 3.200c2.400.5 4 2.500 4 5v1.400c0 2.200-1.600 3.600-3.800 3.600H24Z"
            className="fill-brand"
          />
          {/* window */}
          <path d="M60.500 16.500h17c1.400 0 2.600.6 3.500 1.600l5 5.400H52.500l5.600-6c.7-.7 1.500-1 2.400-1Z" className="fill-white/90" />
          <path d="M70 16.500v7" className="stroke-brand" strokeWidth="1.200" />
          {/* stripe + lights */}
          <path d="M24 31.500h92" className="stroke-white/70" strokeWidth="1.200" />
          <rect x="112" y="27" width="6" height="2.600" rx="1.200" className="fill-yellow-200" />
          <rect x="19.500" y="27.500" width="4" height="2.400" rx="1" className="fill-white" />

          {/* wheels */}
          {[40, 100].map((x) => (
            <g key={x} transform={`translate(${x} 40)`}>
              <circle r="8.500" className="fill-ink" />
              <g className="cm-wheel">
                <circle r="6" className="fill-neutral-300" />
                <path
                  d="M0 -6V6M-6 0H6M-4.200 -4.200L4.200 4.200M4.200 -4.200L-4.200 4.200"
                  className="stroke-ink"
                  strokeWidth="1.400"
                  strokeLinecap="round"
                />
                <circle r="1.800" className="fill-brand" />
              </g>
            </g>
          ))}
        </g>
      </svg>

      <p className="text-sm font-bold tracking-wide text-ink">
        {label}
        <span className="cm-dots" aria-hidden="true" />
      </p>
    </div>
  );
}
