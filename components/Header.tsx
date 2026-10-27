"use client";

import LanguageSwitch from "@/components/i18n/LanguageSwitch";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, UserRound, LogOut, LayoutDashboard, Package, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import SearchBox from "@/components/SearchBox";
import { getMiniCart } from "@/app/cart/mini-actions";

function initialOf(user: { user_metadata?: Record<string, unknown>; email?: string | null } | null) {
  const first = user?.user_metadata?.first_name;
  const source =
    (typeof first === "string" && first.trim()) ||
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    user?.email ||
    "";
  return source ? source.trim().charAt(0).toUpperCase() : "";
}

export default function Header() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const pathname = usePathname();
  const [searching, startSearch] = useTransition();

  const [searchText, setSearchText] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accountLabel, setAccountLabel] = useState("Account");
  const [initial, setInitial] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

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

  // Phones have no hover: tapping anywhere outside, or changing page, closes the account menu.
  useEffect(() => {
    if (!menuOpen) return;
    const away = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let active = true;

    const loadCartCount = async () => {
      try {
        const cart = await getMiniCart();
        if (active) {
          setCartCount(cart.lines.reduce((total, line) => total + Number(line.quantity || 0), 0));
        }
      } catch {
        if (active) setCartCount(0);
      }
    };

    const refreshCartCount = () => {
      void loadCartCount();
    };

    void loadCartCount();
    window.addEventListener("cm-cart-added", refreshCartCount);
    window.addEventListener("cm-cart-changed", refreshCartCount);

    return () => {
      active = false;
      window.removeEventListener("cm-cart-added", refreshCartCount);
      window.removeEventListener("cm-cart-changed", refreshCartCount);
    };
  }, [pathname]);

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
      setInitial(initialOf(user));

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
      setInitial(initialOf(user));

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
          <SearchBox value={searchText} onChange={setSearchText} onSubmit={handleSearch} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {!authLoading &&
            (isAuthenticated ? (
              <>
                <div
                  ref={menuRef}
                  className="group relative"
                  onPointerEnter={(e) => e.pointerType === "mouse" && setMenuOpen(true)}
                  onPointerLeave={(e) => e.pointerType === "mouse" && setMenuOpen(false)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false);
                  }}
                >
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label={`Account menu (${accountLabel})`}
                    onClick={() => setMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink transition hover:bg-brand-tint hover:text-brand"
                  >
                    {initial ? (
                      <span
                        aria-hidden="true"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-black text-white sm:hidden"
                      >
                        {initial}
                      </span>
                    ) : null}
                    <UserRound className={`h-4 w-4 ${initial ? "hidden sm:block" : ""}`} aria-hidden="true" />
                    <span className="hidden sm:inline">{accountLabel}</span>
                    <ChevronDown className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true" />
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
            className="relative inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 pr-9 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-brand"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Cart</span>
            <span
              aria-label={`${cartCount} item${cartCount === 1 ? "" : "s"} in cart`}
              className="absolute right-1.5 top-1/2 inline-flex min-w-5 -translate-y-1/2 items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-black leading-none text-white ring-2 ring-ink"
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          </Link>
        </div>
      </div>
    </header>
    {searching && (
      <div className="fixed inset-x-0 top-0 z-[120] h-1 overflow-hidden bg-brand/20" role="progressbar" aria-label="Searching">
        <div className="cm-topbar h-full w-1/3 bg-brand" />
      </div>
    )}
    </>
  );
}
