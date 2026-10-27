"use client";

import { useEffect, useState } from "react";

type Piece = { left: number; delay: number; dur: number; size: number; rot: number; color: string; drift: number; round: boolean };

const COLORS = ["#d62828", "#0b0b0c", "#f59e0b", "#10b981", "#fb7185", "#f97316"];

// One short burst of confetti when the order is confirmed. Pieces are made after mount (so server and
// browser markup match), fall once, then remove themselves. Skipped for "reduce motion".
export default function Confetti() {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPieces(
      Array.from({ length: 46 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        dur: 2.4 + Math.random() * 1.6,
        size: 6 + Math.random() * 7,
        rot: Math.random() * 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        drift: (Math.random() - 0.5) * 160,
        round: Math.random() > 0.6,
      })),
    );
    const t = setTimeout(() => setPieces([]), 5200);
    return () => clearTimeout(t);
  }, []);

  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="cm-confetti absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            borderRadius: p.round ? "50%" : 2,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ["--drift" as string]: `${p.drift}px`,
            ["--rot" as string]: `${p.rot + 540}deg`,
          }}
        />
      ))}
    </div>
  );
}
