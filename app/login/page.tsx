"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const field =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-medium text-ink shadow-sm outline-none transition focus:border-brand/60 focus:ring-4 focus:ring-brand/10";

export default function LoginPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-ink lg:block">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/hero/login.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.28),rgba(8,8,8,0.92))]" />

        <div className="absolute inset-x-0 bottom-0 p-12 xl:p-16">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand">
            Canuck Motors
          </p>
          <h2 className="mt-4 max-w-lg text-5xl font-black leading-[1.02] tracking-[-0.04em] text-white">
            Engineered for reliability.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-white/65">
            Sign in to track orders and find the right parts faster.
          </p>
        </div>
      </section>

      <section className="relative flex items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#fff,#fff7ed)] px-6 py-12">
        <div className="relative mx-auto w-full max-w-md rounded-[30px] border border-black/5 bg-white p-7 shadow-[0_24px_70px_rgba(0,0,0,0.10)] sm:p-9">
          <Link
            href="/"
            aria-label="Canuck Motors home"
            className="flex justify-center"
          >
            <Image
              src="/logo/canuck-motors-icon.png"
              alt="Canuck Motors"
              width={160}
              height={110}
              priority
              className="h-20 w-auto"
            />
          </Link>

          <h1 className="mt-7 text-center text-3xl font-black tracking-[-0.035em] text-ink">
            Welcome back
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Log in to your Canuck Motors account.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-ink">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={field}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cm-button-primary mt-2 w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {message && (
            <p
              role="alert"
              aria-live="polite"
              className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {message}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/register"
              className="font-semibold text-brand hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
