// A red-and-white tire rotating. CSS only (see .cm-tire-spin in globals.css).
export default function TireLoader({ label = "Loading", className = "" }: { label?: string; className?: string }) {
  const spokes = Array.from({ length: 10 }, (_, i) => i * 36);
  const treads = Array.from({ length: 28 }, (_, i) => i * (360 / 28));
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-5 ${className}`}>
      <svg viewBox="0 0 120 120" className="h-28 w-28 overflow-visible drop-shadow-[0_10px_18px_rgba(214,40,40,0.35)]" aria-hidden="true">
        <g className="cm-tire-spin">
          {/* tyre */}
          <circle cx="60" cy="60" r="56" className="fill-ink" />
          {/* tread blocks */}
          {treads.map((a) => (
            <rect key={a} x="57.500" y="1" width="5" height="7" rx="1.500" className="fill-white/25" transform={`rotate(${a} 60 60)`} />
          ))}
          {/* white sidewall ring */}
          <circle cx="60" cy="60" r="42" className="fill-white" />
          {/* red rim */}
          <circle cx="60" cy="60" r="35" className="fill-brand" />
          {/* alternating white / red spokes */}
          {spokes.map((a, i) => (
            <path
              key={a}
              d="M60 60 L54.500 27 Q60 24 65.500 27 Z"
              className={i % 2 === 0 ? "fill-white" : "fill-brand-dark"}
              transform={`rotate(${a} 60 60)`}
            />
          ))}
          {/* hub */}
          <circle cx="60" cy="60" r="11" className="fill-ink" />
          <circle cx="60" cy="60" r="7" className="fill-white" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx="60" cy="51.500" r="1.800" className="fill-brand" transform={`rotate(${a} 60 60)`} />
          ))}
        </g>
      </svg>
      <p className="text-sm font-bold tracking-[0.18em] text-ink/70">
        {label}
        <span className="cm-dots" />
      </p>
    </div>
  );
}
