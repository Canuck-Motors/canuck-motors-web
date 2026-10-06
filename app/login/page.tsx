"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const field =
  "w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

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

        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/20" />

        <div className="absolute inset-x-0 bottom-0 p-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">
            Canuck Motors
          </p>
          <h2 className="mt-3 max-w-md text-4xl font-bold leading-tight text-white">
            Engineered for reliability.
          </h2>
          <p className="mt-3 max-w-md text-white/70">
            Sign in to track orders and find the right parts faster.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="mx-auto w-full max-w-md">
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

          <h1 className="mt-8 text-center text-3xl font-bold text-ink">
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
              className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
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
