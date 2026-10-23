"use client";

import { memo, useEffect, useState } from "react";

// Canuck Motors tyre loader.
// A black tyre with a red alloy wheel sits on the road. A bump rolls in along the ground,
// the tyre hops over it, lands, settles, and it all starts again.
//
//  - variant="page"   full-screen white overlay (page loads, searches, fitment lookups)
//  - variant="inline" small block that sits inside a page or card
//  - show={false}     fades out, then removes itself (so the page below is revealed smoothly)
//
// Everything is SVG + CSS (classes cm-tire-* in globals.css): no animation library, and
// nothing re-renders while it runs, so a parent re-render never restarts the animation.
// With "reduce motion" switched on, it shows a still tyre.

const DEFAULT_MESSAGE = "Finding the right parts for your vehicle...";
const FADE_MS = 320;

// Wheel centre (100, 76), tyre radius 40, so the road is at y = 116.
const SPOKES = Array.from({ length: 12 }, (_, i) => i * 30);
const BOLTS = Array.from({ length: 5 }, (_, i) => i * 72);

function Drawing({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={`overflow-visible ${className}`} aria-hidden="true" focusable="false">
      {/* road */}
      <line x1="14" y1="116" x2="186" y2="116" className="stroke-ink" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="14" y1="122" x2="186" y2="122" className="cm-tire-dash stroke-brand" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="10 12" />

      {/* the bump that rolls along the road */}
      <g className="cm-tire-bump">
        <path
          d="M0 116 C3 108 11 106 15 112 C18 107 26 109 28 116"
          className="fill-white stroke-ink"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* the tyre */}
      <g className="cm-tire-hop">
        <circle cx="100" cy="76" r="40" className="fill-ink" />
        <circle cx="100" cy="76" r="31" className="fill-none stroke-white/35" strokeWidth="1.4" />
        <circle cx="100" cy="76" r="29" className="fill-white" />
        <g className="cm-tire-roll">
          <g transform="translate(100 76)">
            {SPOKES.map((deg) => (
              <rect key={deg} x="-2.5" y="-27" width="5" height="19" rx="2.5" className="fill-brand" transform={`rotate(${deg})`} />
            ))}
            <circle r="9.5" className="fill-ink" />
            <circle r="6" className="fill-brand" />
            {BOLTS.map((deg) => (
              <circle key={deg} r="1.3" cy="-13.5" className="fill-ink" transform={`rotate(${deg})`} />
            ))}
          </g>
        </g>
      </g>
    </svg>
  );
}

type Props = {
  variant?: "page" | "inline";
  /** true while loading; false fades the loader out and removes it */
  show?: boolean;
  /** text under the brand name */
  message?: string;
  className?: string;
};

function LoadingAnimation({ variant = "inline", show = true, message = DEFAULT_MESSAGE, className = "" }: Props) {
  const [mounted, setMounted] = useState(show);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (show) {
      setMounted(true);
      setLeaving(false);
      return;
    }
    setLeaving(true);
    const t = setTimeout(() => {
      setMounted(false);
      setLeaving(false);
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [show]);

  if (!mounted) return null;

  const content = (
    <div className="flex flex-col items-center gap-3 px-6 text-center">
      <Drawing className={variant === "page" ? "h-40 w-56 sm:h-48 sm:w-[17rem]" : "h-28 w-40 sm:h-32 sm:w-44"} />
      <p className="text-xs font-black uppercase tracking-[0.32em] text-ink">
        Canuck <span className="text-brand">Motors</span>
      </p>
      <p className="max-w-xs text-sm text-ink/60">{message}</p>
    </div>
  );

  if (variant === "page") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy={!leaving}
        className={`cm-ld-overlay fixed inset-0 z-[100] flex items-center justify-center bg-white ${leaving ? "cm-ld-leaving" : ""} ${className}`}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!leaving}
      className={`cm-ld-inline flex items-center justify-center py-8 ${leaving ? "cm-ld-leaving" : ""} ${className}`}
    >
      {content}
    </div>
  );
}

// memo: a parent re-render with the same props never touches the running animation
export default memo(LoadingAnimation);
