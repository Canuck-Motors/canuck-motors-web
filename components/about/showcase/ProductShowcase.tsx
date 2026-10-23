"use client";

import { useRef, useState } from "react";
import { CMMark } from "./CMMark";
import { ProductStory } from "./ProductStory";
import { brakePad } from "./brakePad";
import { waterPump } from "./waterPump";

const PRODUCTS = [waterPump, brakePad];

export default function ProductShowcase() {
  const [id, setId] = useState(PRODUCTS[0].id);
  const topRef = useRef<HTMLDivElement>(null);
  const product = PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];

  const choose = (next: string) => {
    if (next === id) return;
    setId(next);
    const top = topRef.current;
    if (top && top.getBoundingClientRect().top < 0) {
      const header = document.querySelector("header")?.offsetHeight ?? 72;
      window.scrollTo({ top: window.scrollY + top.getBoundingClientRect().top - header, behavior: "smooth" });
    }
  };

  return (
    <div ref={topRef} id="inside" className="mt-14 md:mt-20">
      <div className="bg-ink pb-16 pt-16 text-white md:pb-24 md:pt-24">
        <div className="cm-container">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="cm-eyebrow">Inside a CM part</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] md:text-6xl">Take it apart.</h2>
            </div>
            <CMMark width={92} fill="#d32f2f" />
          </div>

          <div role="tablist" aria-label="Choose a product" className="mt-10 inline-flex rounded-full border border-white/10 bg-white/5 p-1.5">
            {PRODUCTS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === id}
                onClick={() => choose(p.id)}
                className={`rounded-full px-6 py-3 text-sm font-bold transition md:px-8 md:text-base ${
                  p.id === id ? "bg-brand text-white shadow-[0_8px_24px_rgba(214,40,40,0.35)]" : "text-white/65 hover:text-white"
                }`}
              >
                {p.tab}
              </button>
            ))}
          </div>

          <p
            key={product.id}
            className="mt-14 max-w-5xl text-2xl font-semibold leading-snug tracking-[-0.02em] md:mt-20 md:text-4xl lg:text-5xl"
          >
            {product.intro}
          </p>
        </div>
      </div>

      <ProductStory key={product.id} product={product} />

      {/* Text of the other products stays in the page so search engines and AI tools can read all of it. */}
      {PRODUCTS.filter((p) => p.id !== product.id).map((p) => (
        <div key={p.id} className="sr-only">
          <h2>{p.tab}</h2>
          <p>{p.intro}</p>
          {p.chapters.map((c) => (
            <section key={c.title}>
              <h3>{c.title}</h3>
              <p>{c.eyebrow}</p>
              <p>{c.body}</p>
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}
