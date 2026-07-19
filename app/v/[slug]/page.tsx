import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, formatDuration, formatSize } from "@/lib/format";

interface CloudinaryResource {
  secure_url: string;
  created_at: string;
  duration?: number;
  bytes: number;
  context?: { custom?: { title?: string } };
}

async function getRecording(slug: string): Promise<CloudinaryResource | null> {
  if (!/^[a-z0-9]{8,24}$/.test(slug)) return null;

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
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recording = await getRecording(slug);
  const title = recording?.context?.custom?.title ?? "Recording";
  return {
    title: `${title} — RecordFlow`,
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

  const title = recording.context?.custom?.title ?? "Untitled recording";

  return (
    <div className="flex min-h-screen flex-col">
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
          src={recording.secure_url}
          controls
          playsInline
          className="mt-4 w-full rounded-2xl border border-black/10 bg-ink shadow-sm"
        />
        <h1 className="mt-6 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          {formatDate(recording.created_at)}
          {typeof recording.duration === "number" &&
            ` · ${formatDuration(recording.duration)}`}
          {` · ${formatSize(recording.bytes)}`}
        </p>
      </main>

      <footer className="border-t border-black/5 py-6 text-center text-xs text-muted">
        Recorded with RecordFlow — free browser screen recording.
      </footer>
    </div>
  );
}
