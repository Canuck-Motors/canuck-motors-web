"use client";

import { useEffect, useRef } from "react";

// Big glowing brand name behind the brand / model page banner.
// Desktop uses the CSS version (.cm-neon::before). On phones a real text span is measured
// and scaled so the WHOLE name always fits, whatever the brand (Ford, Volkswagen, ...).
export default function BrandNeon({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      if (window.innerWidth > 640) return;
      el.style.fontSize = "100px";
      const w = el.getBoundingClientRect().width || 1;
      const max = window.innerWidth * 0.9;
      const size = Math.min(100 * (max / w), window.innerWidth * 0.26);
      el.style.fontSize = `${size.toFixed(1)}px`;
    };
    fit();
    document.fonts?.ready.then(fit).catch(() => undefined);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [name]);

  return (
    <div className="cm-neon" aria-hidden="true" data-brand={name}>
      <span ref={ref} className="cm-neon-m">
        {name}
      </span>
    </div>
  );
}
