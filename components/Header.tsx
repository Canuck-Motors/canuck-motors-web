"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [searchText, setSearchText] = useState("");

  const handleSearch = () => {
    console.log("Searching for:", searchText);
  };

  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">

        {/* Logo */}
        <Link href="/" className="text-2xl font-bold">
          Canuck Motors
        </Link>

        {/* Search */}
        <div className="flex flex-1">
          <input
            type="text"
            placeholder="Search auto parts..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full rounded-l-md border px-4 py-2 outline-none"
          />

          <button
            onClick={handleSearch}
            className="rounded-r-md bg-black px-5 py-2 text-white"
          >
            Search
          </button>
        </div>

        {/* Account */}
        <Link href="/login" className="text-sm font-medium">
          Login
        </Link>

        {/* Cart */}
        <Link href="/cart" className="text-sm font-medium">
          Cart
        </Link>

      </div>
    </header>
  );
}