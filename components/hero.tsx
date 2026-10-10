"use client";

import { useEffect, useState, useTransition } from "react";
import RoadLoader from "@/components/RoadLoader";
import { createClient } from "@/lib/supabase/client";
// import { useRouter } from "next/router";
import { useRouter } from "next/navigation";
import { lookupVin } from "@/app/vin-actions";

const field =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-medium text-ink shadow-sm outline-none transition duration-200 focus:border-brand/60 focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-black/[0.035] disabled:text-muted-foreground";

type YearOption = {
  id: number;
  year: number;
};

type ManufacturerOption = {
  id: number;
  manufacturer_name: string;
  slug: string;
};

type ModelOption = {
  id: number;
  model_name: string;
  slug: string;
};

type EngineOption = {
  id: number;
  engine_name: string;
  slug: string;
};

type TrimOption = {
  id: number;
  trim_name: string;
  slug: string;
};

export function Hero() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  // ---------------------------------------------
  // SELECTED VALUES
  // ---------------------------------------------

  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [engine, setEngine] = useState("");
  const [trim, setTrim] = useState("");

  const [oeNumber, setOeNumber] = useState("");
  const [vin, setVin] = useState("");
  const [vinMsg, setVinMsg] = useState("");
  const [pending, startTransition] = useTransition();

  // ---------------------------------------------
  // DROPDOWN DATA
  // ---------------------------------------------

  const [years, setYears] = useState<YearOption[]>([]);
  const [manufacturers, setManufacturers] = useState<
    ManufacturerOption[]
  >([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [engines, setEngines] = useState<EngineOption[]>([]);
  const [trims, setTrims] = useState<TrimOption[]>([]);

  // ---------------------------------------------
  // LOADING STATES
  // ---------------------------------------------

  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingEngines, setLoadingEngines] = useState(false);
  const [loadingTrims, setLoadingTrims] = useState(false);

  // ---------------------------------------------
  // LOAD YEARS WHEN PAGE OPENS
  // ---------------------------------------------

  
  useEffect(() => {
    const loadYears = async () => {
      setLoadingYears(true);

      const { data, error } = await supabase
        .from("year")
        .select("id, year")
        .order("year", { ascending: false });
      if (error) {
        console.error("Error loading years:", error.message);
      } else {
        setYears(data ?? []);
      }

      setLoadingYears(false);
    };

    loadYears();
  }, [supabase]);

  // ---------------------------------------------
  // YEAR CHANGED
  // ---------------------------------------------

  const handleYearChange = async (yearId: string) => {
    setYear(yearId);

    // Reset everything after Year
    setMake("");
    setModel("");
    setEngine("");
    setTrim("");

    setManufacturers([]);
    setModels([]);
    setEngines([]);
    setTrims([]);

    if (!yearId) {
      return;
    }

    setLoadingMakes(true);

    const { data, error } = await supabase
      .from("vehicle_fitments")
      .select(`
        manufacturer_id,
        manufacturer (
          id,
          manufacturer_name,
          slug
        )
      `)
      .eq("year_id", Number(yearId));

    if (error) {
      console.error("Error loading manufacturers:", error.message);
      setLoadingMakes(false);
      return;
    }

    const uniqueMakes = new Map<number, ManufacturerOption>();

    data?.forEach((row: any) => {
      if (row.manufacturer) {
        uniqueMakes.set(row.manufacturer.id, row.manufacturer);
      }
    });

    setManufacturers(
      Array.from(uniqueMakes.values()).sort((a, b) =>
        a.manufacturer_name.localeCompare(b.manufacturer_name),
      ),
    );

    setLoadingMakes(false);
  };

  // ---------------------------------------------
  // MANUFACTURER CHANGED
  // ---------------------------------------------

  const handleMakeChange = async (manufacturerId: string) => {
    setMake(manufacturerId);

    setModel("");
    setEngine("");
    setTrim("");

    setModels([]);
    setEngines([]);
    setTrims([]);

    if (!manufacturerId || !year) {
      return;
    }

    setLoadingModels(true);

    const { data, error } = await supabase
      .from("vehicle_fitments")
      .select(`
        model_id,
        models (
          id,
          model_name,
          slug
        )
      `)
      .eq("year_id", Number(year))
      .eq("manufacturer_id", Number(manufacturerId));

    if (error) {
      console.error("Error loading models:", error.message);
      setLoadingModels(false);
      return;
    }

    const uniqueModels = new Map<number, ModelOption>();

    data?.forEach((row: any) => {
      if (row.models) {
        uniqueModels.set(row.models.id, row.models);
      }
    });

    setModels(
      Array.from(uniqueModels.values()).sort((a, b) =>
        a.model_name.localeCompare(b.model_name),
      ),
    );

    setLoadingModels(false);
  };

  // ---------------------------------------------
  // MODEL CHANGED
  // ---------------------------------------------

  const handleModelChange = async (modelId: string) => {
    setModel(modelId);

    setEngine("");
    setTrim("");

    setEngines([]);
    setTrims([]);

    if (!modelId || !year || !make) {
      return;
    }

    setLoadingEngines(true);

    const { data, error } = await supabase
      .from("vehicle_fitments")
      .select(`
        engine_size_id,
        engine_sizes (
          id,
          engine_name,
          slug
        )
      `)
      .eq("year_id", Number(year))
      .eq("manufacturer_id", Number(make))
      .eq("model_id", Number(modelId));

    if (error) {
      console.error("Error loading engines:", error.message);
      setLoadingEngines(false);
      return;
    }

    const uniqueEngines = new Map<number, EngineOption>();

    data?.forEach((row: any) => {
      if (row.engine_sizes) {
        uniqueEngines.set(row.engine_sizes.id, row.engine_sizes);
      }
    });

    setEngines(
      Array.from(uniqueEngines.values()).sort((a, b) =>
        a.engine_name.localeCompare(b.engine_name),
      ),
    );

    setLoadingEngines(false);
  };

  // ---------------------------------------------
  // ENGINE CHANGED
  // ---------------------------------------------

  const handleEngineChange = async (engineId: string) => {
    setEngine(engineId);

    setTrim("");
    setTrims([]);

    if (!engineId || !year || !make || !model) {
      return;
    }

    setLoadingTrims(true);

    const { data, error } = await supabase
      .from("vehicle_fitments")
      .select(`
        trim_id,
        trim (
          id,
          trim_name,
          slug
        )
      `)
      .eq("year_id", Number(year))
      .eq("manufacturer_id", Number(make))
      .eq("model_id", Number(model))
      .eq("engine_size_id", Number(engineId));

    if (error) {
      console.error("Error loading trims:", error.message);
      setLoadingTrims(false);
      return;
    }

    const uniqueTrims = new Map<number, TrimOption>();

    data?.forEach((row: any) => {
      if (row.trim && row.trim.trim_name !== "Unknown") {
        uniqueTrims.set(row.trim.id, row.trim);
      }
    });

    setTrims(
      Array.from(uniqueTrims.values()).sort((a, b) =>
        a.trim_name.localeCompare(b.trim_name),
      ),
    );

    setLoadingTrims(false);
  };

  // ---------------------------------------------
  // SEARCH
  // ---------------------------------------------

  const handleSearch = () => {
  const go = (url: string) => startTransition(() => router.push(url));
  const query = oeNumber.trim();

  if (vin.trim()) {
    setVinMsg("");
    startTransition(async () => {
      const res = await lookupVin(vin);
      if (res.ok) router.push(res.url);
      else setVinMsg(res.message);
    });
    return;
  }

  if (query) {
    go(`/products/search/${encodeURIComponent(query)}`);
    return;
  }

  const selectedYear = years.find((item) => item.id === Number(year));
  const selectedMake = manufacturers.find((item) => item.id === Number(make));
  const selectedModel = models.find((item) => item.id === Number(model));
  const selectedEngine = engines.find((item) => item.id === Number(engine));
  const selectedTrim = trims.find((item) => item.id === Number(trim));

  const candidates = [
    selectedYear?.year,
    selectedMake?.slug,
    selectedModel?.slug,
    selectedEngine?.slug,
    selectedTrim?.slug,
  ];

  const segments: string[] = [];
  for (const segment of candidates) {
    if (segment === undefined) break;
    segments.push(String(segment));
  }

  go(segments.length ? `/products/${segments.join("/")}` : "/products");
};
  // ---------------------------------------------
  // RESET
  // ---------------------------------------------

  const handleReset = () => {
    setYear("");
    setMake("");
    setModel("");
    setEngine("");
    setTrim("");

    setManufacturers([]);
    setModels([]);
    setEngines([]);
    setTrims([]);

    setOeNumber("");
    setVin("");
    setVinMsg("");
  };

  return (
    <section id="vehicle-finder" className="relative isolate overflow-hidden bg-ink">
      {pending && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 backdrop-blur-sm">
          <RoadLoader />
        </div>
      )}
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover"
      >
        <source src="/hero/hero.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,8,8,0.96)_0%,rgba(8,8,8,0.82)_44%,rgba(8,8,8,0.44)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute -right-24 top-10 -z-10 h-80 w-80 rounded-full bg-brand/20 blur-[100px]" />

      <div className="cm-container pb-16 pt-8 md:pb-24 md:pt-10">
        {/* Hero text */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3.5 py-2 text-xs font-black uppercase tracking-[0.2em] text-brand backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-brand shadow-[0_0_16px_rgba(249,115,22,0.8)]" />
            Canuck Motors
          </div>

          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-5xl md:text-7xl">
            Find the right part. <span className="text-brand">Fit it with confidence.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
            Search by vehicle, Canuck Motors part number, OE number, or interchange and get to compatible parts without the guesswork.
          </p>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-white/75">
            <span>Vehicle fitment catalog</span>
            <span className="text-brand">•</span>
            <span>OE & interchange search</span>
            <span className="text-brand">•</span>
            <span>Secure checkout</span>
          </div>
        </div>

        {/* Finder card */}
        <div className="mt-10 overflow-hidden rounded-[30px] border border-white/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:mt-12">
          <div className="border-b border-black/5 bg-[linear-gradient(90deg,#0d0d0d,#181818)] px-6 py-5 text-white md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-brand">
                  Vehicle Finder
                </p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.02em] md:text-2xl">
                  Find parts made for your vehicle
                </h2>
              </div>
              <p className="text-sm font-medium text-white/55">
                Year → Make → Model → Engine → Trim
              </p>
            </div>
          </div>

          <div className="p-6 md:p-8">
          {/* Vehicle dropdowns */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* YEAR */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Year
              </label>

              <select
                value={year}
                onChange={(e) => handleYearChange(e.target.value)}
                className={field}
              >
                <option value="">
                  {loadingYears ? "Loading years..." : "Select Year"}
                </option>

                {years.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.year}
                  </option>
                ))}
              </select>
            </div>

            {/* MAKE */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Make
              </label>

              <select
                value={make}
                onChange={(e) => handleMakeChange(e.target.value)}
                disabled={!year || loadingMakes}
                className={field}
              >
                <option value="">
                  {loadingMakes ? "Loading makes..." : "Select Make"}
                </option>

                {manufacturers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.manufacturer_name}
                  </option>
                ))}
              </select>
            </div>

            {/* MODEL */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Model
              </label>

              <select
                value={model}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={!make || loadingModels}
                className={field}
              >
                <option value="">
                  {loadingModels ? "Loading models..." : "Select Model"}
                </option>

                {models.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.model_name}
                  </option>
                ))}
              </select>
            </div>

            {/* ENGINE */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Engine
              </label>

              <select
                value={engine}
                onChange={(e) => handleEngineChange(e.target.value)}
                disabled={!model || loadingEngines}
                className={field}
              >
                <option value="">
                  {loadingEngines ? "Loading engines..." : "Select Engine"}
                </option>

                {engines.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.engine_name}
                  </option>
                ))}
              </select>
            </div>

            {/* TRIM */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trim
              </label>

              <select
                value={trim}
                onChange={(e) => setTrim(e.target.value)}
                disabled={!engine || loadingTrims}
                className={field}
              >
                <option value="">
                  {loadingTrims ? "Loading trims..." : "Select Trim"}
                </option>

                {trims.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.trim_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search / reset (the vehicle finder is the only search here) */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="sm:w-80">
              <input
                value={vin}
                onChange={(e) => {
                  setVin(e.target.value.toUpperCase());
                  setVinMsg("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                maxLength={17}
                autoComplete="off"
                spellCheck={false}
                placeholder="Or enter your 17-character VIN"
                aria-label="Vehicle identification number (VIN)"
                className={`${field} font-mono tracking-wider`}
              />
            </div>
            <button
              onClick={handleSearch}
              className="cm-button-primary min-h-[48px] flex-1 px-8"
            >
              {pending ? "Searching..." : "Search Parts"}
            </button>

            <button
              onClick={handleReset}
              className="min-h-[48px] rounded-full px-6 py-3 text-sm font-bold text-ink/60 transition hover:bg-brand-tint hover:text-brand"
            >
              Reset
            </button>
          </div>
          {vinMsg && (
            <p className="mt-3 text-sm font-semibold text-brand" role="alert">
              {vinMsg}
            </p>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}