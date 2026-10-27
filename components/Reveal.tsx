"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Fades a section up the first time it scrolls into view. Content is fully visible without JS,
// and anything already on screen at load is left alone (no flash, no layout shift).
export default function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    el.setAttribute("data-reveal", "hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-reveal", "shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`cm-reveal ${className}`}>
      {children}
    </div>
  );
}
