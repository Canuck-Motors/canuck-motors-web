"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, ChevronsLeft } from "lucide-react";

const KEY = "cm-admin-sidebar-hidden";

export function AdminShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") setHidden(true);
    } catch {
      /* storage blocked: stay open */
    }
  }, []);

  const set = (v: boolean) => {
    setHidden(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="lg:flex lg:items-start lg:gap-2">
      <aside
        className={`relative border-b border-white/10 bg-ink px-2 py-2 transition-all duration-300 ease-out print:hidden lg:sticky lg:top-24 lg:mt-6 lg:shrink-0 lg:self-start lg:overflow-hidden lg:rounded-3xl lg:border lg:border-white/10 lg:bg-[linear-gradient(180deg,#0c0c0e,#16090b)] lg:shadow-[0_24px_60px_rgba(0,0,0,0.35)] ${
          hidden
            ? "lg:ml-0 lg:w-0 lg:border-transparent lg:p-0 lg:opacity-0 lg:shadow-none"
            : "lg:ml-4 lg:w-64 lg:p-3 lg:opacity-100"
        }`}
        aria-hidden={hidden}
        inert={hidden}
      >
        <button
          type="button"
          onClick={() => set(true)}
          aria-label="Hide menu"
          title="Hide menu"
          className="absolute right-3 top-3 z-10 hidden h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/60 transition hover:bg-brand hover:text-white lg:flex"
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="lg:w-[14.5rem]">{sidebar}</div>
      </aside>

      {hidden && (
        <button
          type="button"
          onClick={() => set(false)}
          aria-label="Show menu"
          title="Show menu"
          className="cm-side-item fixed left-0 top-32 z-30 hidden items-center gap-1 rounded-r-full bg-ink py-3 pl-2 pr-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_10px_30px_rgba(0,0,0,0.4)] ring-1 ring-white/10 transition hover:bg-brand lg:flex print:hidden"
        >
          <ChevronRight className="h-4 w-4 text-brand group-hover:text-white" aria-hidden="true" />
          Menu
        </button>
      )}

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
