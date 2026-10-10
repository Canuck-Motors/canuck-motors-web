"use client";

import { useEffect, useId, useMemo, useState } from "react";

type Spec = { name: string; value: string };
type PartNumber = { brand: string; number: string };
type Fitment = {
  year: number;
  make: string;
  model: string;
  engine: string;
  fuel: string;
  trim: string;
  bodyType: string;
  comment: string;
};

const PAGE = 25;

function PartTable({ rows, head }: { rows: PartNumber[]; head: string }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">None listed for this part.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">{head}</th>
            <th className="px-4 py-3">Part number</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-4 py-2.5 font-medium text-ink">{r.brand}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{r.number}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Compatibility({ rows }: { rows: Fitment[] }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const searchId = useId();

  const filtered = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return rows;
    return rows.filter((r) => {
      const hay = `${r.year} ${r.make} ${r.model} ${r.engine} ${r.fuel} ${r.trim} ${r.bodyType} ${r.comment}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [rows, q]);

  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Compatibility mappings are not currently available for this product.
      </p>
    );
  }

  return (
    <div>
      <label htmlFor={searchId} className="sr-only">
        Search vehicles
      </label>
      <input
        id={searchId}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setShown(PAGE);
        }}
        placeholder="Search year, make, model, engine..."
        className="mb-4 w-full max-w-sm rounded-full border border-input bg-secondary px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {["Year", "Brand", "Model", "Engine", "Fuel type", "Trim", "Body type", "Comment"].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, shown).map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-4 py-2.5 font-medium text-ink">{r.year}</td>
                <td className="px-4 py-2.5">{r.make}</td>
                <td className="px-4 py-2.5">{r.model}</td>
                <td className="px-4 py-2.5">{r.engine}</td>
                <td className="px-4 py-2.5">{r.fuel}</td>
                <td className="px-4 py-2.5">{r.trim}</td>
                <td className="px-4 py-2.5">{r.bodyType}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.comment}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                  No vehicles match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {Math.min(shown, filtered.length)} of {filtered.length.toLocaleString()}
        </span>
        {shown < filtered.length && (
          <button
            type="button"
            onClick={() => setShown((s) => s + PAGE * 4)}
            className="rounded-full border border-brand/30 px-4 py-1.5 font-bold text-brand transition hover:bg-brand hover:text-white"
          >
            Show more
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProductTabs({
  description,
  specs,
  fitments,
  oe,
  interchanges,
}: {
  description: string;
  specs: Spec[];
  fitments: Fitment[];
  oe: PartNumber[];
  interchanges: PartNumber[];
}) {
  const tabs = [
    { id: "description", label: "Description" },
    { id: "specification", label: "Specification" },
    { id: "compatibility", label: `Vehicle Compatibility (${fitments.length.toLocaleString()})` },
    { id: "oe", label: `OE Parts Number (${oe.length})` },
    { id: "other", label: `Other Part Numbers (${interchanges.length})` },
  ];
  const [active, setActive] = useState("description");
  const base = useId();

  // Links like <a href="#compatibility"> open that tab and scroll to it
  useEffect(() => {
    const ids = tabs.map((t) => t.id);
    const open = (id: string) => {
      setActive(id);
      requestAnimationFrame(() =>
        document.getElementById("product-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    };

    const fromHash = () => {
      const id = window.location.hash.replace("#", "");
      if (ids.includes(id)) open(id);
    };
    fromHash();

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[data-open-tab]") as HTMLAnchorElement | null;
      const id = a?.dataset.openTab;
      if (a && id && ids.includes(id)) {
        e.preventDefault();
        history.replaceState(null, "", `#${id}`);
        open(id);
      }
    };
    document.addEventListener("click", onClick);
    window.addEventListener("hashchange", fromHash);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("hashchange", fromHash);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every panel stays in the HTML (hidden attribute), so search engines
  // and AI crawlers still read all the content.
  return (
    <section id="product-tabs" className="mt-14 scroll-mt-28 rounded-[28px] border border-black/5 bg-white shadow-[0_16px_46px_rgba(0,0,0,0.06)]">
      <div
        role="tablist"
        aria-label="Product information"
        className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-3 md:px-5"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            id={`${base}-tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`${base}-panel-${t.id}`}
            onClick={() => setActive(t.id)}
            className={`whitespace-nowrap rounded-t-xl border-b-2 px-4 py-3 text-sm font-bold transition ${
              active === t.id
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 md:p-8">
        <div role="tabpanel" id={`${base}-panel-description`} aria-labelledby={`${base}-tab-description`} hidden={active !== "description"}>
          <h2 className="mb-4 text-xl font-bold text-ink">Description</h2>
          <div className="whitespace-pre-line leading-7 text-muted-foreground">{description}</div>
        </div>

        <div role="tabpanel" id={`${base}-panel-specification`} aria-labelledby={`${base}-tab-specification`} hidden={active !== "specification"}>
          <h2 className="mb-4 text-xl font-bold text-ink">Specification</h2>
          {specs.length ? (
            <dl className="overflow-hidden rounded-2xl border border-border text-sm">
              {specs.map((s, i) => (
                <div key={s.name} className={`grid grid-cols-2 gap-4 px-4 py-3 ${i % 2 ? "bg-white" : "bg-secondary"}`}>
                  <dt className="font-semibold text-ink">{s.name}</dt>
                  <dd className="text-muted-foreground">{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No specifications listed for this part.</p>
          )}
        </div>

        <div role="tabpanel" id={`${base}-panel-compatibility`} aria-labelledby={`${base}-tab-compatibility`} hidden={active !== "compatibility"}>
          <h2 className="mb-4 text-xl font-bold text-ink">Vehicle Compatibility</h2>
          <Compatibility rows={fitments} />
        </div>

        <div role="tabpanel" id={`${base}-panel-oe`} aria-labelledby={`${base}-tab-oe`} hidden={active !== "oe"}>
          <h2 className="mb-4 text-xl font-bold text-ink">OE Parts Number</h2>
          <PartTable rows={oe} head="OE brand" />
        </div>

        <div role="tabpanel" id={`${base}-panel-other`} aria-labelledby={`${base}-tab-other`} hidden={active !== "other"}>
          <h2 className="mb-4 text-xl font-bold text-ink">Other Part Numbers</h2>
          <PartTable rows={interchanges} head="Brand" />
        </div>
      </div>
    </section>
  );
}
