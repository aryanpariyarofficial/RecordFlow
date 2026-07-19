"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

/** Password prompt for protected share links. */
export function PasswordGate({ slug }: { slug: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/recordings/${slug}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      router.refresh();
    } else if (res?.status === 403) {
      setError("Wrong password — check with whoever sent you this link.");
    } else if (res?.status === 429) {
      setError("Too many attempts — wait a few minutes and try again.");
    } else {
      setError("Something went wrong. Try again.");
    }
  };

  return (
    <div className="mt-4 flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-black/10 bg-ink px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
        🔒
      </span>
      <p className="mt-4 font-semibold text-white">
        This recording is password-protected
      </p>
      <p className="mt-1 text-sm text-white/60">
        Enter the password you were given to watch it.
      </p>
      <form
        onSubmit={submit}
        className="mt-5 flex w-full max-w-sm items-center gap-2"
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-primary">{error}</p>}
    </div>
  );
}
