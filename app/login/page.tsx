"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "confirm"
      ? "That confirmation link is invalid or expired — try signing in, or sign up again."
      : null
  );
  const [confirmSent, setConfirmSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createBrowserSupabase();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setBusy(false);
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Wrong email or password."
            : error.message
        );
        return;
      }
      router.push("/");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      setBusy(false);
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        // Email confirmation disabled — signed in immediately.
        router.push("/");
        router.refresh();
      } else {
        setConfirmSent(true);
      }
    }
  };

  if (confirmSent) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-3 text-muted">
          We sent a confirmation link to <strong>{email}</strong>. Click it,
          then come back and sign in.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-center text-2xl font-bold">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-center text-sm text-muted">
        {mode === "signin"
          ? "Sign in to upload recordings and share links."
          : "Free account — unlocks share links and your video library."}
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="rounded-lg border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-secondary"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (6+ characters)"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="rounded-lg border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-secondary"
        />
        {error && <p className="text-sm text-primary">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-1 rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:opacity-60"
        >
          {busy
            ? "Working…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
        className="mt-4 w-full text-center text-sm font-medium text-secondary transition hover:brightness-75"
      >
        {mode === "signin"
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center px-6">
      <header className="flex w-full max-w-5xl items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
            <span className="h-3 w-3 rounded-full bg-white" />
          </span>
          <span className="font-heading text-xl font-bold tracking-tight">
            RecordFlow
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm font-medium text-muted transition hover:text-ink"
        >
          Back to recorder
        </Link>
      </header>
      <main className="flex w-full flex-1 items-center justify-center pb-24">
        <div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
