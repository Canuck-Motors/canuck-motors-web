"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Key, ProductDef } from "./types";

const STAGE = 520; // SVG space and rig size in px
const SLICE = 2; // px between side-wall slices

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);

function pose(keys: Key[], p: number): Key {
  if (p <= keys[0].p) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (p <= b.p) {
      const t = ease((p - a.p) / (b.p - a.p));
      const l = (x: number, y: number) => x + (y - x) * t;
      return { p, rx: l(a.rx, b.rx), ry: l(a.ry, b.ry), rz: l(a.rz, b.rz), s: l(a.s, b.s), e: l(a.e, b.e) };
    }
  }
  return keys[keys.length - 1];
}

export function ProductStory({ product }: { product: ProductDef }) {
  const { layers, keys, chapters } = product;
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    // Sit the pinned stage just under the sticky site header.
    const header = document.querySelector("header");
    const setTop = () => section.style.setProperty("--cm-top", `${header?.offsetHeight ?? 72}px`);
    setTop();

    // Load the heavy part images only when the section is about to come on screen.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "1500px 0px" },
    );
    io.observe(section);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let fit = 1;
    const measure = () => {
      setTop();
      fit = Math.min(1, stage.clientWidth / (STAGE + 60), stage.clientHeight / (STAGE + 60));
    };
    measure();
    window.addEventListener("resize", measure);

    const ranges = chapters.map((c, i) => [c.from, chapters[i + 1]?.from ?? 1.01] as const);
    const bump = (p: number, a: number, b: number) => clamp((p - a) / 0.05) * clamp((b - p) / 0.05);

    let current = -1;
    let lastChapter = -1;
    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const rect = section.getBoundingClientRect();
      const run = rect.height - (pinRef.current?.clientHeight ?? stage.clientHeight);
      const target = clamp(-rect.top / Math.max(1, run));
      const next = current < 0 || reduce ? target : current + (target - current) * 0.09;
      if (Math.abs(next - current) < 0.00005) return;
      current = next;
      const p = current;

      const k = pose(keys, p);
      if (rigRef.current) {
        rigRef.current.style.transform = `scale(${(k.s * fit).toFixed(4)}) rotateX(${k.rx.toFixed(2)}deg) rotateY(${k.ry.toFixed(2)}deg) rotateZ(${k.rz.toFixed(2)}deg)`;
      }
      if (shadowRef.current) {
        shadowRef.current.style.opacity = String(0.25 + 0.35 * (1 - k.e));
        shadowRef.current.style.transform = `translate(-50%, 0) scale(${(k.s * fit * (1 + k.e * 0.4)).toFixed(3)}, ${(k.s * fit).toFixed(3)})`;
      }
      if (glowRef.current) {
        const gx = 30 + 40 * (0.5 + 0.5 * Math.sin(p * 9 + k.rz * 0.03));
        const gy = 28 + 14 * Math.cos(p * 6);
        glowRef.current.style.background = `radial-gradient(ellipse 38% 30% at ${gx.toFixed(1)}% ${gy.toFixed(1)}%, rgba(255,255,255,0.20), transparent 70%)`;
      }

      // Highlight the chapter's focus layers and dim the rest.
      const focus = new Map<string, number>();
      let anyFocus = 0;
      chapters.forEach((c, i) => {
        if (!c.focus.length) return;
        const w = bump(p, ranges[i][0], ranges[i][1]);
        anyFocus = Math.max(anyFocus, w);
        c.focus.forEach((id) => focus.set(id, Math.max(focus.get(id) ?? 0, w)));
      });

      layers.forEach((layer, i) => {
        const el = layerRefs.current[i];
        if (!el) return;
        const own = focus.get(layer.id) ?? 0;
        const z = layer.z + layer.ez * k.e + own * 24 * Math.sign(layer.ez || 1);
        const spin = (layer.spin ?? 0) * ease(clamp(p / 0.92)); // lands upright for the final shot
        el.style.transform = `translateZ(${z.toFixed(2)}px) rotateZ(${spin.toFixed(2)}deg)`;
        el.style.opacity = String(1 - 0.72 * anyFocus * (1 - own));
        el.style.filter = own > 0.01 ? `drop-shadow(0 0 ${(18 * own).toFixed(1)}px rgba(214,40,40,${(0.75 * own).toFixed(2)}))` : "none";
      });

      let ch = 0;
      chapters.forEach((c, i) => {
        if (p >= c.from) ch = i;
      });
      if (ch !== lastChapter) {
        lastChapter = ch;
        setActive(ch);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [chapters, keys, layers]);

  return (
    <section ref={sectionRef} className="relative h-[460vh] bg-ink text-white md:h-[620vh]" aria-label={`${product.tab}: inside view`}>
      <div ref={pinRef} className="sticky top-[var(--cm-top,72px)] h-[calc(100svh-var(--cm-top,72px))] overflow-hidden">
        {/* Backdrop */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_68%_45%,rgba(214,40,40,0.22),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" />

        <div className="cm-container relative grid h-full grid-rows-[auto_1fr] gap-2 py-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] lg:grid-rows-1 lg:gap-8 lg:py-10">
          {/* Chapter copy */}
          <div className="relative flex lg:items-center">
            <div className="relative min-h-[150px] w-full lg:min-h-[260px]">
              {chapters.map((c, i) => (
                <div key={c.title} className="absolute inset-x-0 top-0 lg:top-1/2 lg:-translate-y-1/2">
                <div
                  aria-hidden={i !== active}
                  className={`transition-all duration-700 ease-out ${
                    i === active ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                  style={{ transform: `translateY(${i === active ? 0 : i < active ? -24 : 24}px)` }}
                >
                  <p className="cm-eyebrow">
                    <span className="mr-2 text-white/40">{String(i + 1).padStart(2, "0")}</span>
                    {c.eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-black leading-tight tracking-[-0.035em] md:text-4xl lg:text-5xl">{c.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/65 md:mt-4 md:text-base md:leading-7">{c.body}</p>
                  {i === chapters.length - 1 && (
                    <Link href={product.cta.href} className="cm-button-primary mt-6 hidden gap-2 md:inline-flex">
                      {product.cta.label}
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3D stage */}
          <div ref={stageRef} className="relative min-h-0 [perspective:1800px]">
            <div
              ref={shadowRef}
              className="pointer-events-none absolute bottom-[8%] left-1/2 h-10 w-[60%] rounded-[50%] bg-black/70 blur-2xl"
            />
            <div ref={glowRef} className="pointer-events-none absolute inset-0 z-10 mix-blend-soft-light" />
            <div
              ref={rigRef}
              className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
              style={{ width: STAGE, height: STAGE, marginLeft: -STAGE / 2, marginTop: -STAGE / 2 }}
            >
              {layers.map((layer, i) => {
                const slices = Math.max(1, Math.round(layer.thickness / SLICE));
                return (
                  <div
                    key={layer.id}
                    ref={(el) => {
                      layerRefs.current[i] = el;
                    }}
                    className="absolute inset-0 transition-[filter] [transform-style:preserve-3d] will-change-transform"
                  >
                    {Array.from({ length: slices }, (_, s) => (
                      <svg
                        key={s}
                        viewBox={`0 0 ${STAGE} ${STAGE}`}
                        className="absolute inset-0 h-full w-full"
                        style={{ transform: `translateZ(${-(s + 1) * SLICE}px)` }}
                        aria-hidden="true"
                      >
                        {layer.outline.map((d, j) => (
                          <path key={j} d={d} fill={layer.edge} fillRule="evenodd" />
                        ))}
                        {layer.outline.map((d, j) => (
                          <path key={`d${j}`} d={d} fill="#000" fillOpacity={(0.12 + 0.5 * ((s + 1) / slices)).toFixed(2)} fillRule="evenodd" />
                        ))}
                      </svg>
                    ))}
                    <svg viewBox={`0 0 ${STAGE} ${STAGE}`} className="absolute inset-0 h-full w-full [backface-visibility:hidden]" aria-hidden="true">
                      {near ? layer.face : null}
                    </svg>
                    {layer.back && (
                      <svg
                        viewBox={`0 0 ${STAGE} ${STAGE}`}
                        className="absolute inset-0 h-full w-full [backface-visibility:hidden]"
                        style={{ transform: `translateZ(${-(slices + 1) * SLICE}px) rotateY(180deg)` }}
                        aria-hidden="true"
                      >
                        {near ? layer.back : null}
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Part legend */}
            <ul className="absolute inset-x-0 top-0 flex flex-wrap justify-center gap-2 lg:justify-end">
              {layers.map((l) => {
                const on = chapters[active]?.focus.includes(l.id);
                return (
                  <li
                    key={l.id}
                    className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] transition duration-500 ${
                      on ? "border-brand bg-brand text-white" : "border-white/10 bg-white/5 text-white/55"
                    }`}
                  >
                    {l.label}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
