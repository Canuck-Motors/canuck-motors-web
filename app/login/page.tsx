"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const field =
  "w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Login Successful!");
  };

  const isError = message && message !== "Login Successful!";

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand side */}
      <section className="relative hidden flex-col justify-end bg-ink p-12 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/30 via-transparent to-transparent" />
        <div className="relative max-w-md">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">
            Canuck Motors
          </p>
          <h2 className="mt-3 text-4xl font-bold leading-tight text-white">
            Engineered for reliability.
          </h2>
          <p className="mt-3 text-white/70">
            Sign in to track orders and find the right parts faster.
          </p>
        </div>
      </section>

      {/* Form side */}
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <Link href="/" aria-label="Canuck Motors home" className="flex justify-center">
            <Image
              src="/logo/canuck-motors-icon.png"
              alt="Canuck Motors"
              width={400}
              height={110}
              priority
              className="h-12 w-auto"
            />
          </Link>

          <h1 className="mt-8 text-center text-3xl font-bold text-ink">Welcome back</h1>
<p className="mt-2 text-center text-sm text-muted-foreground">
  Log in to your account.
</p>
          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Email
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Password
              </label>
              <input
                type="password"
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
              className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {message && (
            <p
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                isError
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
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