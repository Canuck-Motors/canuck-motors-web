"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

type Suggestion = { id: number; name: string; sku: string | null; price: number | null; href: string; image: string | null };

// Header search with instant suggestions (part numbers and products) while you type.
export default function SearchBox({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const typed = useRef(false); // only suggest for text the visitor typed, not the term shown on a results page

  useEffect(() => {
    const q = value.trim();
    if (!typed.current || q.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const json = await res.json();
        setItems(json.suggestions ?? []);
        setActive(-1);
        setOpen(true);
      } catch {
        /* aborted or offline: no suggestions */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  // After going to another page, the box is just showing the search term: no popup.
  useEffect(() => {
    typed.current = false;
    setOpen(false);
    setItems([]);
  }, [pathname]);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  const showList = open && value.trim().length >= 2 && (items.length > 0 || loading);

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex w-full overflow-hidden rounded-full border border-black/10 bg-secondary shadow-inner transition focus-within:border-brand/60 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand/10">
        <div className="flex items-center pl-4 text-muted-foreground">
          <Search className="h-4 w-4" aria-hidden="true" />
        </div>
        <input
          id="site-search"
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Search part number or product..."
          value={value}
          onChange={(e) => {
            typed.current = true;
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => items.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && items.length) {
              e.preventDefault();
              setActive((a) => (a + 1) % items.length);
              setOpen(true);
            } else if (e.key === "ArrowUp" && items.length) {
              e.preventDefault();
              setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
            } else if (e.key === "Escape") {
              setOpen(false);
            } else if (e.key === "Enter") {
              if (open && active >= 0 && items[active]) {
                e.preventDefault();
                setOpen(false);
                router.push(items[active].href);
              } else {
                setOpen(false);
                onSubmit();
              }
            }
          }}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted-foreground/75"
        />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onSubmit();
          }}
          className="bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark sm:px-5"
        >
          Search
        </button>
      </div>

      {showList && (
        <div
          id="search-suggestions"
          role="listbox"
          className="cm-fit-in absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl"
        >
          {loading && items.length === 0 &&
            [0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-11 w-11 animate-pulse rounded-lg bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-secondary" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
                </div>
              </div>
            ))}
          {items.map((s, i) => (
            <a
              key={s.id}
              id={`sg-${i}`}
              role="option"
              aria-selected={i === active}
              href={s.href}
              onMouseEnter={() => setActive(i)}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                router.push(s.href);
              }}
              className={`flex items-center gap-3 px-4 py-2.5 transition ${i === active ? "bg-brand-tint" : "hover:bg-secondary"}`}
            >
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-black/5 bg-white">
                {s.image ? <Image src={s.image} alt="" fill sizes="44px" className="object-contain p-1" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink">{s.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.sku ? `Part · ${s.sku}` : "Automotive part"}</span>
              </span>
              {s.price !== null && <span className="shrink-0 text-sm font-black text-ink">${Number(s.price).toFixed(2)}</span>}
            </a>
          ))}
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSubmit();
              }}
              className="block w-full border-t border-black/5 px-4 py-3 text-left text-sm font-bold text-brand transition hover:bg-brand-tint"
            >
              See all results for “{value.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
