"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { setNavLinkVisible } from "@/app/admin/navigation/actions";

type Item = { key: string; label: string; href: string; locked: boolean; visible: boolean };

export default function NavToggles({ items, extras = {} }: { items: Item[]; extras?: Record<string, ReactNode> }) {
  const [state, setState] = useState(() => Object.fromEntries(items.map((i) => [i.key, i.visible])));
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [pending, start] = useTransition();

  const toggle = (key: string) => {
    const next = !state[key];
    setState((s) => ({ ...s, [key]: next }));
    setMsg("");
    start(async () => {
      const res = await setNavLinkVisible(key, next);
      if (!res.ok) {
        setState((s) => ({ ...s, [key]: !next }));
        setMsg(res.error ?? "Could not save.");
      }
    });
  };

  return (
    <div className="mt-8 max-w-4xl">
      <ul className="divide-y divide-black/5 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_14px_36px_rgba(0,0,0,0.06)]">
        {items.map((item) => {
          const on = state[item.key];
          return (
            <li key={item.key} className="px-5 py-4">
              <div className="flex items-center justify-between gap-4">
              {extras[item.key] ? (
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [item.key]: !o[item.key] }))}
                  aria-expanded={Boolean(open[item.key])}
                  className="group flex flex-1 items-center gap-3 text-left"
                >
                  <span>
                    <span className="block font-bold text-ink">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {open[item.key] ? "Click to close the list" : "Click to open the list"} · {on ? `Shown in the menu (${item.href})` : "Hidden from the menu"}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-brand transition-transform duration-300 ${open[item.key] ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              ) : (
              <div>
                <p className="font-bold text-ink">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.locked ? "Always shown" : on ? `Shown in the menu (${item.href})` : "Hidden from the menu"}
                </p>
              </div>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`Show ${item.label} in the menu`}
                disabled={item.locked || pending}
                onClick={() => toggle(item.key)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                  on ? "bg-brand" : "bg-black/20"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ${
                    on ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              </div>
              {extras[item.key] && (
                <div className={`grid transition-all duration-300 ease-out ${open[item.key] ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden" inert={!open[item.key]}>
                    <div className="mt-4 border-l-2 border-brand/30 pl-4">{extras[item.key]}</div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {msg && (
        <p className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          {msg}
        </p>
      )}
      <p className="mt-4 text-sm text-muted-foreground">
        This only hides the link in the top menu. The page itself can still be opened if someone has its address.
      </p>
    </div>
  );
}
