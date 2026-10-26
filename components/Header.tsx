"use client";

import LanguageSwitch from "@/components/i18n/LanguageSwitch";
import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingCart, UserRound, LogOut, LayoutDashboard, Package, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import LoadingAnimation from "@/components/LoadingAnimation";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const pathname = usePathname();
  const [searching, startSearch] = useTransition();

  const [searchText, setSearchText] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accountLabel, setAccountLabel] = useState("Account");
  const [authLoading, setAuthLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setIsStaff(false);
      setMenuOpen(false);
      return;
    }
    supabase.rpc("current_user_staff_role").then(({ data }) => {
      if (active) setIsStaff(Boolean(data));
    });
    return () => {
      active = false;
    };
  }, [supabase, isAuthenticated]);

  // The header lives in the layout, so its text would otherwise stay on every
  // page. On a search results page show what was searched; anywhere else clear it.
  useEffect(() => {
    const match = pathname.match(/^\/products\/search\/([^/]+)/);
    if (match) {
      try {
        setSearchText(decodeURIComponent(match[1]));
      } catch {
        setSearchText(match[1]);
      }
    } else {
      setSearchText("");
    }
  }, [pathname]);

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
    startSearch(() => router.push(`/products/search/${encodeURIComponent(query)}`));
  };

  const handleLogout = async () => {
    // Never wait forever for sign-out, then do a full page load to clear the old session.
    await Promise.race([
      supabase.auth.signOut(),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]).catch(() => undefined);
    window.location.assign("/");
  };

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b border-black/5 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-5 md:flex-nowrap md:gap-6 md:py-3">
        <Link
          href="/"
          aria-label="Canuck Motors home"
          className="shrink-0 transition duration-200 hover:opacity-80"
        >
          <Image
            src="/logo/Canuck-Motors.png"
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
              className="bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark sm:px-5"
            >
              Search
            </button>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {!authLoading &&
            (isAuthenticated ? (
              <>
                <div
                  className="group relative"
                  onMouseEnter={() => setMenuOpen(true)}
                  onMouseLeave={() => setMenuOpen(false)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false);
                  }}
                >
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink transition hover:bg-brand-tint hover:text-brand"
                  >
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">{accountLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-50 w-52 pt-2"
                    >
                      <div className="overflow-hidden rounded-xl border border-black/10 bg-white py-1 shadow-xl">
                        {isStaff && (
                          <Link
                            role="menuitem"
                            href="/admin"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-brand-tint hover:text-brand"
                          >
                            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                            Admin dashboard
                          </Link>
                        )}
                        <Link
                          role="menuitem"
                          href="/account"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-brand-tint hover:text-brand"
                        >
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                          Profile
                        </Link>
                        <Link
                          role="menuitem"
                          href="/account/orders"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-brand-tint hover:text-brand"
                        >
                          <Package className="h-4 w-4" aria-hidden="true" />
                          My orders
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 border-t border-black/5 px-4 py-2.5 text-left text-sm font-semibold text-ink hover:bg-brand-tint hover:text-brand"
                        >
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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

          <LanguageSwitch />

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
    <LoadingAnimation variant="page" show={searching} message="Searching our catalog..." />
    </>
  );
}
