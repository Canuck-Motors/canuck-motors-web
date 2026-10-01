"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [searchText, setSearchText] = useState("");

  const handleSearch = () => {
    console.log("Searching for:", searchText);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-md">
      <div className="flex w-full items-center gap-6 px-4 py-3 md:px-8">
        {/* Logo */}
        <Link href="/" aria-label="Canuck Motors home" className="shrink-0">
         <Image
  src="/logo/canuck-motors.png"
  alt="Canuck Motors"
  width={70}
  height={30}
  priority
  className="h-12 w-auto md:h-10"
/>
        </Link>

        {/* Search */}
        <div className="flex flex-1">
          <input
            type="text"
            placeholder="Search auto parts..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full rounded-l-full border border-input bg-secondary px-5 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
          />
          <button
            onClick={handleSearch}
            className="rounded-r-full bg-brand px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark"
          >
            Search
          </button>
        </div>

        {/* Account */}
        <Link
          href="/login"
          className="text-sm font-medium text-ink transition hover:text-brand"
        >
          Login
        </Link>

        {/* Cart */}
        <Link
          href="/cart"
          className="text-sm font-medium text-ink transition hover:text-brand"
        >
          Cart
        </Link>
      </div>
    </header>
  );
}