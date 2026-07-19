"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useUser } from "./use-user";

export function AuthButton() {
  const router = useRouter();
  const { user, loading } = useUser();

  if (loading) {
    return <span className="h-9 w-20 animate-pulse rounded-full bg-black/5" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/85"
      >
        Log in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span
        className="hidden max-w-[16rem] truncate text-sm text-muted sm:block"
        title={user.email ?? undefined}
      >
        {user.email}
      </span>
      <button
        onClick={async () => {
          await createBrowserSupabase().auth.signOut();
          router.push("/");
          router.refresh();
        }}
        className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5"
      >
        Sign out
      </button>
    </div>
  );
}
