"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/router";

const field =
  "w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-ink outline-none transition duration-200 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground";

type YearOption = {
  id: number;
  year: number;
};

type ManufacturerOption = {
  id: number;
  manufacturer_name: string;
};

type ModelOption = {
  id: number;
  model_name: string;
};

type EngineOption = {
  id: number;
  engine_name: string;
};

type TrimOption = {
  id: number;
  trim_name: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
      console.log("YEAR DATA:", data);
      console.log("YEAR ERROR:", error);
      if (error) {
        console.error("Error loading years:", error.message);
      } else {
        setYears(data ?? []);
      }

      setLoadingYears(false);
    };

    loadYears();
  }, []);

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
          manufacturer_name
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
          model_name
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
          engine_name
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
          trim_name
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
    // OE search
    if (oeNumber.trim()) {
      router.push(
        `/products/search/${encodeURIComponent(oeNumber.trim())}`
      );
      return;
    }

    if (!year || !make || !model || !engine) {
      alert("Please select Year, Make, Model and Engine.");
      return;
    }

    const selectedYear = years.find(
      (item) => item.id === Number(year)
    );

    const selectedMake = manufacturers.find(
      (item) => item.id === Number(make)
    );

    const selectedModel = models.find(
      (item) => item.id === Number(model)
    );

    const selectedEngine = engines.find(
      (item) => item.id === Number(engine)
    );

    const selectedTrim = trims.find(
      (item) => item.id === Number(trim)
    );

    if (
      !selectedYear ||
      !selectedMake ||
      !selectedModel ||
      !selectedEngine
    ) {
      return;
    }

    let url =
      `/products/` +
      `${selectedYear.year}/` +
      `${slugify(selectedMake.manufacturer_name)}/` +
      `${slugify(selectedModel.model_name)}/` +
      `${slugify(selectedEngine.engine_name)}`;

    if (selectedTrim) {
      url += `/${slugify(selectedTrim.trim_name)}`;
    }

    router.push(url);
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
        className="absolute inset-0 -z-20 h-full w-full scale-110 object-cover"
      >
        <source src="/hero/hero.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/60 via-ink/30 to-ink/70" />

      <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 md:pt-28">
        {/* Hero text */}
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
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
        <div className="mt-10 rounded-[28px] border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-ink">
              Find parts for your vehicle
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Select your vehicle details to see compatible parts.
            </p>
          </div>

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

          {/* Divider */}
          <div className="my-7 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* OE search */}
          <div className="flex flex-col gap-4 lg:flex-row">
            <input
              type="text"
              value={oeNumber}
              onChange={(e) => setOeNumber(e.target.value)}
              placeholder="Search by OE Number, CM Number or Interchange"
              className={`${field} flex-1`}
            />

            <button
              onClick={handleSearch}
              className="rounded-xl bg-brand px-8 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg"
            >
              Search Parts
            </button>

            <button
              onClick={handleReset}
              className="rounded-xl px-6 py-3 text-sm font-medium text-ink/70 transition hover:bg-brand-tint hover:text-brand"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}