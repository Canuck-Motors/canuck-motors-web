"use client";

import { useState } from "react";

const field =
  "w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground";

export function Hero() {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [oeNumber, setOeNumber] = useState("");

  const handleSearch = () => {
    console.log({ year, make, model, oeNumber });
  };

  const handleReset = () => {
    setYear("");
    setMake("");
    setModel("");
    setOeNumber("");
  };

  return (
    <section className="relative isolate overflow-hidden bg-ink">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 -z-20 h-full w-full scale-110 object-cover opacity-100"
      >
        <source src="/hero/hero.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/50 via-ink/20 to-ink/60" />

      <div className="mx-auto max-w-7xl px-6 pb-20 pt-20 md:pt-28">
        {/* Text */}
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">
            Canuck Motors
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-white md:text-6xl">
            North America&apos;s automotive parts experts
          </h1>
          <p className="mt-4 text-lg text-white/75">
            Engineered for reliability. Find the perfect fit for your vehicle.
          </p>
        </div>

        {/* Finder card */}
        <div className="mt-10 rounded-3xl bg-white p-6 shadow-2xl md:p-8">
          <h2 className="text-lg font-semibold text-ink">Quick search</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={field}
            >
              <option value="">Select Year</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>

            <select
              value={make}
              onChange={(e) => setMake(e.target.value)}
              disabled={!year}
              className={field}
            >
              <option value="">Select Make</option>
              <option value="Toyota">Toyota</option>
              <option value="Honda">Honda</option>
              <option value="Ford">Ford</option>
              <option value="Chevrolet">Chevrolet</option>
              <option value="BMW">BMW</option>
            </select>

            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!make}
              className={field}
            >
              <option value="">Select Model</option>
              <option value="Corolla">Corolla</option>
              <option value="Civic">Civic</option>
              <option value="F-150">F-150</option>
              <option value="Silverado">Silverado</option>
              <option value="X5">X5</option>
            </select>
          </div>

          <div className="my-5 flex items-center gap-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <input
            type="text"
            value={oeNumber}
            onChange={(e) => setOeNumber(e.target.value)}
            placeholder="Search by OE number or interchange"
            className={field}
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleSearch}
              className="rounded-full bg-brand px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Search Parts
            </button>
            <button
              onClick={handleReset}
              className="rounded-full px-6 py-3 text-sm font-medium text-ink/70 transition hover:bg-brand-tint hover:text-brand"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}