"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingCart, UserRound, LogOut } from "lucide-react";
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
    <header className="sticky top-0 z-50 w-full border-b border-black/5 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <div className="flex w-full items-center gap-3 px-3 py-3 sm:px-5 md:gap-6">
        <Link
          href="/"
          aria-label="Canuck Motors home"
          className="shrink-0 transition duration-200 hover:opacity-80"
        >
          <Image
            src="/logo/canuck-motors.png"
            alt="Canuck Motors"
            width={110}
            height={46}
            priority
            className="-ml-1 h-10 w-auto md:h-11"
          />
        </Link>

        <div className="order-3 flex w-full basis-full items-center md:order-none md:flex-1 md:basis-auto">
          <label htmlFor="site-search" className="sr-only">
            Search Canuck Motors products
          </label>
          <div className="flex w-full overflow-hidden rounded-full border border-black/10 bg-secondary shadow-inner transition focus-within:border-brand/60 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand/10">
            <div className="flex items-center pl-4 text-muted-foreground">
              <Search className="h-4 w-4" aria-hidden="true" />
            </div>
            <input
              id="site-search"
              type="search"
              placeholder="Search part number or product..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted-foreground/75"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-dark"
            >
              Search
            </button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!authLoading &&
            (isAuthenticated ? (
              <>
                <Link
                  href="/account"
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink transition hover:bg-brand-tint hover:text-brand"
                >
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{accountLabel}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Log out"
                  className="hidden rounded-full p-2 text-ink/60 transition hover:bg-black/5 hover:text-brand md:inline-flex"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink transition hover:bg-brand-tint hover:text-brand"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            ))}

          <Link
            href="/cart"
            data-cart-target
            className="relative inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-brand"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Cart</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
