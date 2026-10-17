"use client";

import { useEffect, useRef } from "react";

// Words light up one by one as the paragraph scrolls through the viewport.
export function RevealText({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = Array.from(el.querySelectorAll<HTMLSpanElement>("span[data-w]"));
    let raf = 0;
    let last = -1;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.85 - vh * 0.25 + r.height * 0.4)));
      if (Math.abs(p - last) < 0.001) return;
      last = p;
      const lit = p * spans.length;
      spans.forEach((s, i) => {
        s.style.opacity = String(0.18 + 0.82 * Math.min(1, Math.max(0, lit - i)));
      });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i} data-w="" className="transition-opacity duration-200" style={{ opacity: 0.18 }}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}
