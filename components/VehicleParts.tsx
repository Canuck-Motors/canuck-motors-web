"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, SlidersHorizontal } from "lucide-react";

export type PartGroup = {
  id: string;
  label: string;
  count: number;
  content: ReactNode;
};

// Filter sidebar (desktop) / scrolling chips (phones) for the parts that fit the selected vehicle.
// Choosing a type shows only that type; "All parts" shows every group. Pure display filter: the
// products and fitment come from the server exactly as before.
export default function VehicleParts({
  groups,
  vehicleName,
  total,
}: {
  groups: PartGroup[];
  vehicleName: string;
  total: number;
}) {
  const [active, setActive] = useState<string>("all");
  const resultsRef = useRef<HTMLDivElement>(null);

  // Open on a type if the link says so (?type=g-water-pump).
  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get("type");
      if (t && groups.some((g) => g.id === t)) setActive(t);
    } catch {}
  }, [groups]);

  function choose(id: string) {
    setActive(id);
    try {
      const url = new URL(window.location.href);
      if (id === "all") url.searchParams.delete("type");
      else url.searchParams.set("type", id);
      window.history.replaceState(null, "", url.toString());
    } catch {}
    const el = resultsRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const shown = active === "all" ? groups : groups.filter((g) => g.id === active);
  const vehicleSafe = vehicleName;

  const item = (id: string, label: string, count: number, i: number) => {
    const on = active === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => choose(id)}
        aria-pressed={on}
        style={{ animationDelay: `${i * 55}ms` }}
        className={`cm-filter-item group flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold transition-all duration-200 ${
          on ? "bg-ink text-white shadow-md" : "text-ink hover:bg-brand-tint hover:text-brand"
        }`}
      >
        <span className="flex items-center gap-2">
          <span
            className={`grid h-4 w-4 place-items-center rounded-full border transition-all duration-200 ${
              on ? "scale-100 border-brand bg-brand" : "scale-90 border-black/20 bg-white"
            }`}
          >
            {on && <Check className="h-3 w-3 text-white" aria-hidden="true" />}
          </span>
          {label}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-black transition ${on ? "bg-white/15 text-white" : "bg-secondary text-muted-foreground"}`}>
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      {/* Desktop sidebar */}
      <aside className="cm-filter-panel hidden lg:block" aria-label="Filter parts by type">
        <div className="sticky top-28 rounded-[22px] border border-black/5 bg-white p-4 shadow-[0_14px_40px_rgba(0,0,0,0.05)]">
          <p className="flex items-center gap-2 px-1 pb-3 text-[11px] font-black uppercase tracking-[0.16em] text-brand">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" /> Part type
          </p>
          <div className="space-y-1">
            {item("all", "All parts", total, 0)}
            {groups.map((g, i) => item(g.id, g.label, g.count, i + 1))}
          </div>
        </div>
      </aside>

      {/* Phone / tablet chips */}
      <div className="cm-filter-panel -mx-4 mb-6 overflow-x-auto px-4 pb-1 lg:hidden" aria-label="Filter parts by type">
        <div className="flex w-max gap-2">
          {[{ id: "all", label: "All parts", count: total }, ...groups].map((g, i) => {
            const on = active === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => choose(g.id)}
                aria-pressed={on}
                style={{ animationDelay: `${i * 55}ms` }}
                className={`cm-filter-item inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-all duration-200 active:scale-95 ${
                  on ? "border-ink bg-ink text-white shadow-md" : "border-black/10 bg-white text-ink"
                }`}
              >
                {g.label}
                <span className={`rounded-full px-1.5 text-xs font-black ${on ? "bg-white/20" : "bg-secondary text-muted-foreground"}`}>{g.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div ref={resultsRef} className="min-w-0 scroll-mt-24">
        <div key={active} className="cm-filter-results space-y-12">
          {shown.map((g, i) => (
            <div key={g.id} id={g.id} className={`scroll-mt-28 ${active === "all" && i > 0 ? "cm-hide-toggle" : ""}`}>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-black/10 pb-3">
                <h3 className="text-2xl font-black tracking-[-0.03em] text-ink">{g.label}</h3>
                <p className="text-sm font-semibold text-muted-foreground">
                  {g.count} {g.count === 1 ? "option" : "options"} for your {vehicleSafe}
                </p>
              </div>
              {g.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
