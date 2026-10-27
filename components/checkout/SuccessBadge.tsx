"use client";

const DOTS = Array.from({ length: 12 }, (_, i) => i * 30);

// A solid green seal that stamps in, draws its white check, and sends out one burst of dots.
export default function SuccessBadge() {
  return (
    <div className="relative mx-auto h-28 w-28">
      {/* one-time burst of dots */}
      {DOTS.map((deg, i) => (
        <span
          key={deg}
          aria-hidden="true"
          className="cm-seal-dot absolute left-1/2 top-1/2 -ml-1 -mt-1 h-2 w-2 rounded-full"
          style={{
            background: i % 2 ? "#10b981" : "#34d399",
            ["--a" as string]: `${deg}deg`,
          }}
        />
      ))}

      <div className="cm-seal-in absolute inset-0 grid place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#34d399,#059669)] shadow-[0_14px_34px_rgba(5,150,105,0.35)]">
        <svg
          viewBox="0 0 48 48"
          className="h-16 w-16 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path className="cm-seal-check" pathLength={1} d="M12 25.5l8 8L36 15" />
        </svg>
      </div>
    </div>
  );
}
