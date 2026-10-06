"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [searchText, setSearchText] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accountLabel, setAccountLabel] = useState("Account");
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!mounted) return;

      const user = data.user;
      setIsAuthenticated(Boolean(user));

      const firstName = user?.user_metadata?.first_name;
      setAccountLabel(
        typeof firstName === "string" && firstName.trim()
          ? firstName.trim()
          : "Account"
      );

      setAuthLoading(false);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;

      setIsAuthenticated(Boolean(user));

      const firstName = user?.user_metadata?.first_name;
      setAccountLabel(
        typeof firstName === "string" && firstName.trim()
          ? firstName.trim()
          : "Account"
      );

      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSearch = () => {
    const query = searchText.trim();

    if (!query) return;

    router.push(`/products/search/${encodeURIComponent(query)}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-md">
      <div className="flex w-full items-center gap-4 px-4 py-3 md:gap-6 md:px-8">
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

        <div className="flex flex-1">
          <label htmlFor="site-search" className="sr-only">
            Search Canuck Motors products
          </label>
          <input
            id="site-search"
            type="search"
            placeholder="Search part number, OE number or product..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full rounded-l-full border border-input bg-secondary px-5 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="rounded-r-full bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark md:px-6"
          >
            Search
          </button>
        </div>

        {!authLoading &&
          (isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/protected"
                className="text-sm font-medium text-ink transition hover:text-brand"
              >
                {accountLabel}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden text-sm font-medium text-ink/70 transition hover:text-brand sm:inline"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-ink transition hover:text-brand"
            >
              Login
            </Link>
          ))}

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
