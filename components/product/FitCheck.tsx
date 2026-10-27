"use client";

import { useMemo, useState } from "react";
import { Check, CircleAlert } from "lucide-react";

type Row = { year: number; make: string; model: string };

// "Does it fit my vehicle?" Pick year, make and model: answers from this part's own fitment list.
export default function FitCheck({ rows, count }: { rows: Row[]; count: number | null }) {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  const years = useMemo(() => [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a), [rows]);
  const makes = useMemo(() => [...new Set(rows.filter((r) => !year || r.year === Number(year)).map((r) => r.make))].sort(), [rows, year]);
  const models = useMemo(
    () => [...new Set(rows.filter((r) => (!year || r.year === Number(year)) && (!make || r.make === make)).map((r) => r.model))].sort(),
    [rows, year, make],
  );
  const ready = year && make && model;
  const fits = ready && rows.some((r) => r.year === Number(year) && r.make === make && r.model === model);

  const select =
    "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10";

  return (
    <div className="mt-6 rounded-[24px] border border-brand/15 bg-brand-tint/55 p-5 shadow-sm">
      <h2 className="text-lg font-black text-ink">Does it fit your vehicle?</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {count ? `Mapped to ${count.toLocaleString()} vehicle configurations. ` : ""}Pick yours to check.
      </p>

      {rows.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <label className="sr-only" htmlFor="fit-year">Year</label>
          <select id="fit-year" className={select} value={year} onChange={(e) => { setYear(e.target.value); setMake(""); setModel(""); }}>
            <option value="">Year</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <label className="sr-only" htmlFor="fit-make">Make</label>
          <select id="fit-make" className={select} value={make} onChange={(e) => { setMake(e.target.value); setModel(""); }}>
            <option value="">Make</option>
            {makes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <label className="sr-only" htmlFor="fit-model">Model</label>
          <select id="fit-model" className={select} value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="">Model</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      )}

      {ready && (
        <p
          role="status"
          className={`cm-fit-in mt-3 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold ${
            fits ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
          }`}
        >
          {fits ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
          <span>
            {fits
              ? `Yes, it fits a ${year} ${make} ${model}. Check the engine and trim in the list below.`
              : `Not listed for a ${year} ${make} ${model}. Check the full list below or ask us.`}
          </span>
        </p>
      )}

      <a href="#compatibility" data-open-tab="compatibility" className="mt-3 inline-flex text-sm font-semibold text-brand hover:underline">
        See the full compatibility list
      </a>
    </div>
  );
}
