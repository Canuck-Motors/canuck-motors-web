"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";

type View = "grid" | "list";
const KEY = "cm-product-view";
const EVENT = "cm-product-view";

// Product cards: 2-per-row grid on phones by default, with a Grid / List switch.
// Tablets and desktops always use their normal grid; the switch is phone-only.
export default function ProductGridView({
  children,
  className = "grid gap-6 sm:grid-cols-2 lg:grid-cols-4",
  toggle = true,
}: {
  children: React.ReactNode;
  className?: string;
  toggle?: boolean;
}) {
  const [view, setView] = useState<View>("grid");

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "list") setView("list");
    } catch {}
    const on = (e: Event) => setView((e as CustomEvent<View>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  const choose = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    window.dispatchEvent(new CustomEvent(EVENT, { detail: v }));
  };

  const btn = (v: View, label: string, Icon: typeof List) => (
    <button
      type="button"
      onClick={() => choose(v)}
      aria-pressed={view === v}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
        view === v ? "bg-ink text-white" : "text-ink/70"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <div>
      {toggle && (
        <div className="mb-4 flex justify-end sm:hidden">
          <div className="inline-flex rounded-full border border-black/10 bg-white p-1">
            {btn("grid", "Grid", LayoutGrid)}
            {btn("list", "List", List)}
          </div>
        </div>
      )}
      <div className={`cm-pgrid ${className}`} data-view={view}>
        {children}
      </div>
    </div>
  );
}
