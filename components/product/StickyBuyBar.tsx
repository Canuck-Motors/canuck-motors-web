"use client";

import { useEffect, useState } from "react";

// Phones only: once the main Add to Cart button scrolls out of view, a bar with the price and the same
// button slides up from the bottom. It clicks the real button, so stock, login and cart rules are unchanged.
export default function StickyBuyBar({ name, price }: { name: string; price: number | null }) {
  const [show, setShow] = useState(false);
  const [label, setLabel] = useState("Add to Cart");

  useEffect(() => {
    const host = document.querySelector<HTMLElement>("[data-main-buy]");
    if (!host) return;
    let io: IntersectionObserver | null = null;
    const attach = () => {
      const target = host.querySelector<HTMLElement>("button[type=submit], a");
      if (!target) return false;
      setLabel(target.tagName === "A" ? (target.textContent ?? "Buy").trim() : "Add to Cart");
      io?.disconnect();
      io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
      io.observe(target);
      return true;
    };
    // The button streams in after the stock check: wait for it.
    attach();
    const mo = new MutationObserver(() => attach());
    mo.observe(host, { childList: true, subtree: true });
    return () => {
      io?.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 px-4 pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] backdrop-blur transition-transform duration-300 md:hidden ${
        show ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-muted-foreground">{name}</p>
          <p className="text-lg font-black leading-tight text-ink">{price !== null ? `$${Number(price).toFixed(2)}` : "Contact us"}</p>
        </div>
        <button
          type="button"
          tabIndex={show ? 0 : -1}
          onClick={() => document.querySelector<HTMLElement>("[data-main-buy] button[type=submit], [data-main-buy] a")?.click()}
          className="cm-button-primary shrink-0 whitespace-nowrap"
        >
          {label}
        </button>
      </div>
    </div>
  );
}
