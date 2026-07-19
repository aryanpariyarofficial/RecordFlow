import type { Metadata } from "next";
import Link from "next/link";
import { listRecordings } from "@/lib/db";
import { getUsage } from "@/lib/cloudinary-server";
import { thumbnailUrl } from "@/lib/cloudinary-urls";
import { LibraryItem } from "@/components/library-item";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Library — RecordFlow",
  description: "Your RecordFlow recordings.",
};

export default async function LibraryPage() {
  const [recordings, usage] = await Promise.all([listRecordings(), getUsage()]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
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
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:brightness-110"
        >
          New recording
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-20">
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Library</h1>
            <p className="mt-1 text-muted">
              {recordings
                ? `${recordings.length} recording${recordings.length === 1 ? "" : "s"}`
                : "Your uploaded recordings"}
            </p>
          </div>
          {usage && (
            <div className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm">
              <p className="font-semibold">
                Cloudinary credits: {usage.usedCredits.toFixed(2)} /{" "}
                {usage.limitCredits}
              </p>
              <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-black/10">
                <div
                  className={`h-full rounded-full ${
                    usage.usedPercent > 80
                      ? "bg-primary"
                      : "bg-gradient-to-r from-primary to-secondary"
                  }`}
                  style={{ width: `${Math.min(100, usage.usedPercent)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {recordings === null && (
          <div className="mt-10 rounded-2xl border border-black/10 bg-white p-8">
            <h2 className="text-xl font-bold">One-time database setup needed</h2>
            <p className="mt-2 max-w-2xl text-muted">
              The library stores recording details in your Supabase project.
              Open the Supabase dashboard → <strong>SQL Editor</strong> →{" "}
              <strong>New query</strong>, paste the contents of{" "}
              <code>supabase/schema.sql</code> from the repo, and click{" "}
              <strong>Run</strong>. Then refresh this page.
            </p>
          </div>
        )}

        {recordings && recordings.length === 0 && (
          <div className="mt-10 rounded-2xl border border-black/10 bg-white p-10 text-center">
            <h2 className="text-xl font-bold">No recordings yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-muted">
              Record something and hit &quot;Upload &amp; get link&quot; — it
              will show up here.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-lg shadow-primary/25 transition hover:brightness-110"
            >
              Start recording
            </Link>
          </div>
        )}

        {recordings && recordings.length > 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recordings.map((recording) => (
              <LibraryItem
                key={recording.id}
                slug={recording.slug}
                title={recording.title}
                createdAt={recording.created_at}
                durationSeconds={recording.duration_seconds}
                views={recording.views}
                processing={recording.status === "processing"}
                thumbnail={thumbnailUrl(recording.slug)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-black/5 py-6 text-center text-xs text-muted">
        RecordFlow — this page will be private to your account once login
        ships.
      </footer>
    </div>
  );
}
