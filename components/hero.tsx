"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import LoadingAnimation from "@/components/LoadingAnimation";
import { createClient } from "@/lib/supabase/client";
// import { useRouter } from "next/router";
import { useRouter } from "next/navigation";
import { lookupVin } from "@/app/vin-actions";

const field =
  "w-full [color-scheme:light] [&>option]:bg-white [&>option]:text-ink appearance-none rounded-2xl border-2 border-black/25 bg-white py-3.5 pl-4 pr-12 text-base font-semibold text-ink shadow-sm outline-none transition duration-200 hover:border-black/50 focus:border-brand/60 focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-white disabled:text-ink/60 disabled:opacity-100";

function StepLabel({ n, text, done, active }: { n: number; text: string; done: boolean; active: boolean }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black transition-colors duration-300 ${
          done ? "bg-white text-ink" : active ? "bg-brand text-white" : "bg-white/15 text-white/70"
        }`}
        aria-hidden="true"
      >
        {done ? "✓" : n}
      </span>
      <span className={`text-sm font-bold ${done || active ? "text-white" : "text-white/70"}`}>{text}</span>
    </div>
  );
}

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

// Supabase returns at most 1000 rows per request, so read every page.
// (Without this, a year with thousands of fitments showed only some makes.)
async function fetchAllRows(
  page: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: { message: string } | null }>,
): Promise<{ data: any[] | null; error: { message: string } | null }> {
  const all: any[] = [];
  for (let from = 0; from < 100000; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) return { data: null, error };
    all.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return { data: all, error: null };
}

// Phones get their own (portrait) background video; larger screens keep the wide one.
function HeroVideo() {
  const [src, setSrc] = useState("/hero/hero.mp4");
  const ref = useRef<HTMLVideoElement>(null);
  // Phones only autoplay a video that is really muted; React does not always set that attribute, so force it and call play().
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    v.addEventListener("loadeddata", tryPlay);
    // iOS only counts a finished tap (touchend / click) as permission to play.
    const resume = () => {
      tryPlay();
      window.removeEventListener("touchend", resume);
      window.removeEventListener("click", resume);
    };
    window.addEventListener("touchend", resume, { passive: true });
    window.addEventListener("click", resume);
    return () => {
      v.removeEventListener("loadeddata", tryPlay);
      window.removeEventListener("touchend", resume);
      window.removeEventListener("click", resume);
    };
  }, [src]);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setSrc(mq.matches ? "/hero/hero-mobile.mp4" : "/hero/hero.mp4");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return (
    <video
      ref={ref}
      key={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover"
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

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

    const { data, error } = await fetchAllRows((from, to) =>
      supabase
        .from("vehicle_fitments")
      .select(`
        manufacturer_id,
        manufacturer (
          id,
          manufacturer_name,
          slug
        )
      `)
      .eq("year_id", Number(yearId))
        .order("id")
        .range(from, to),
    );

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

    const { data, error } = await fetchAllRows((from, to) =>
      supabase
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
      .eq("manufacturer_id", Number(manufacturerId))
        .order("id")
        .range(from, to),
    );

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

    const { data, error } = await fetchAllRows((from, to) =>
      supabase
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
      .eq("model_id", Number(modelId))
        .order("id")
        .range(from, to),
    );

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

    const { data, error } = await fetchAllRows((from, to) =>
      supabase
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
      .eq("engine_size_id", Number(engineId))
        .order("id")
        .range(from, to),
    );

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

  const stepVals = [year, make, model, engine, trim];
  const activeStep = stepVals.findIndex((v) => !v);

  return (
    <section id="vehicle-finder" className="relative isolate overflow-hidden bg-ink">
      {/* Search, VIN and vehicle-fitment lookups: fades in while loading, fades out when done */}
      <LoadingAnimation variant="page" show={pending} />
      {/* Background video */}
      <HeroVideo />

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
        <div className="mt-10 overflow-hidden rounded-[30px] border border-white/20 bg-black/40 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-[6px] md:mt-12">
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
              <p className="text-sm font-semibold text-white/85">
                Year → Make → Model → Engine → Trim
              </p>
            </div>
          </div>

          <div className="p-6 md:p-8">
          {/* Vehicle dropdowns */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* YEAR */}
            <div>
              <StepLabel n={1} text="Year" done={Boolean(stepVals[0])} active={activeStep === 0} />

              <div className="relative">
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
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/70"
                aria-hidden="true"
              />
            </div>
            </div>

            {/* MAKE */}
            <div>
              <StepLabel n={2} text="Make" done={Boolean(stepVals[1])} active={activeStep === 1} />

              <div className="relative">
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
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/70"
                aria-hidden="true"
              />
            </div>
            </div>

            {/* MODEL */}
            <div>
              <StepLabel n={3} text="Model" done={Boolean(stepVals[2])} active={activeStep === 2} />

              <div className="relative">
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
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/70"
                aria-hidden="true"
              />
            </div>
            </div>

            {/* ENGINE */}
            <div>
              <StepLabel n={4} text="Engine" done={Boolean(stepVals[3])} active={activeStep === 3} />

              <div className="relative">
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
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/70"
                aria-hidden="true"
              />
            </div>
            </div>

            {/* TRIM */}
            <div>
              <StepLabel n={5} text="Trim" done={Boolean(stepVals[4])} active={activeStep === 4} />

              <div className="relative">
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
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/70"
                aria-hidden="true"
              />
            </div>
            </div>
          </div>

          {/* Search / reset (the vehicle finder is the only search here) */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
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
              className="min-h-[48px] rounded-full px-6 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10 hover:text-white"
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