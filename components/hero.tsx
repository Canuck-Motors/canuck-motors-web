"use client";

import { useState } from "react";

export function Hero()
{
  const[year, setYear] = useState("");
  const[make, setMake] = useState("");
  const[model, setModel] = useState("");

  const handleSearch = () => {
    console.log("Year: ", year);
    console.log("Make: ", make);
    console.log("Model: ", model);
  };

  return(
    <section className="bg-gray-100 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <h1 className="text-4xl font-bold">
          Find the right parts for your vehicle
        </h1>

        <p className="mt-4 text-lg text-gray-600">
          Select your vehicle and find compatible auto parts.
        </p>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-md">
           {/* Year */}
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="rounded-md border px-4 py-3"
            >
              <option value="">Select Year</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>

            {/* Make */}
            <select
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="rounded-md border px-4 py-3"
            >
              <option value="">Select Make</option>
              <option value="Toyota">Toyota</option>
              <option value="Honda">Honda</option>
              <option value="Ford">Ford</option>
              <option value="Chevrolet">Chevrolet</option>
              <option value="BMW">BMW</option>
            </select>

            {/* Model */}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-md border px-4 py-3"
            >
              <option value="">Select Model</option>
              <option value="Corolla">Corolla</option>
              <option value="Civic">Civic</option>
              <option value="F-150">F-150</option>
              <option value="Silverado">Silverado</option>
              <option value="X5">X5</option>
            </select>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="rounded-md bg-black px-5 py-3 font-medium text-white"
            >
              Search Parts
            </button>

        </div>
      </div>
    </section>
  );
}