"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const field =
  "w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function RegisterPage() {
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccess(false);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSuccess(true);
    setMessage(
      "Registration successful. Check your email if confirmation is enabled."
    );
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Left: video panel */}
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
            Join North America&apos;s parts experts.
          </h2>
          <p className="mt-3 max-w-md text-white/70">
            Create an account to save vehicles, track orders, and check out
            faster.
          </p>
        </div>
      </section>

      {/* Right: form */}
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
            Create your account
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            It only takes a minute.
          </p>

          <form onSubmit={handleRegister} className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  First name
                </label>
                <input
                  type="text"
                  required
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={field}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Last name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Smith"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={field}
                />
              </div>
            </div>

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
                minLength={6}
                placeholder="At least 6 characters"
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
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>

          {message && (
            <p
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                success
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}