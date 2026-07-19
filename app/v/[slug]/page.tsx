import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecordingBySlug } from "@/lib/db";
import { videoUrl } from "@/lib/cloudinary-server";
import { formatDate, formatDuration, formatSize } from "@/lib/format";
import { ViewTracker } from "@/components/view-tracker";

export const dynamic = "force-dynamic";

interface RecordingView {
  title: string;
  url: string;
  createdAt: string;
  durationSeconds: number | null;
  sizeBytes: number | null;
  views: number | null;
}

async function fromCloudinary(slug: string): Promise<RecordingView | null> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/video/upload/recordflow/${slug}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
      },
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) return null;
  const body = await res.json();
  return {
    title: body.context?.custom?.title ?? "Untitled recording",
    url: body.secure_url,
    createdAt: body.created_at,
    durationSeconds: typeof body.duration === "number" ? body.duration : null,
    sizeBytes: body.bytes,
    views: null,
  };
}

async function getRecording(slug: string): Promise<RecordingView | null> {
  if (!/^[a-z0-9]{8,24}$/.test(slug)) return null;

  const row = await getRecordingBySlug(slug);
  if (row) {
    return {
      title: row.title,
      url: videoUrl(slug),
      createdAt: row.created_at,
      durationSeconds: row.duration_seconds,
      sizeBytes: row.size_bytes,
      views: row.views,
    };
  }
  // Recordings uploaded before the database existed (or if the metadata
  // insert failed) still resolve straight from Cloudinary.
  return fromCloudinary(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recording = await getRecording(slug);
  return {
    title: `${recording?.title ?? "Recording"} — RecordFlow`,
    description: "Watch this screen recording on RecordFlow.",
  };
}

export default async function ViewerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recording = await getRecording(slug);
  if (!recording) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <ViewTracker slug={slug} />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
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
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/85"
        >
          Record your own
        </Link>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-20">
        <video
          src={recording.url}
          controls
          playsInline
          className="mt-4 w-full rounded-2xl border border-black/10 bg-ink shadow-sm"
        />
        <h1 className="mt-6 text-2xl font-bold sm:text-3xl">
          {recording.title}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {formatDate(recording.createdAt)}
          {typeof recording.durationSeconds === "number" &&
            ` · ${formatDuration(recording.durationSeconds)}`}
          {typeof recording.sizeBytes === "number" &&
            ` · ${formatSize(recording.sizeBytes)}`}
          {typeof recording.views === "number" &&
            ` · ${recording.views} view${recording.views === 1 ? "" : "s"}`}
        </p>
      </main>

      <footer className="border-t border-black/5 py-6 text-center text-xs text-muted">
        Recorded with RecordFlow — free browser screen recording.
      </footer>
    </div>
  );
}
