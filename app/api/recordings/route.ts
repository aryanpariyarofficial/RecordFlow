import { insertRecording } from "@/lib/db";

const SLUG_RE = /^[a-z0-9]{8,24}$/;

/** Persist recording metadata after a successful Cloudinary upload. */
export async function POST(request: Request) {
  let body: {
    slug?: unknown;
    title?: unknown;
    durationSeconds?: unknown;
    sizeBytes?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.slug !== "string" || !SLUG_RE.test(body.slug)) {
    return Response.json({ error: "Invalid slug." }, { status: 400 });
  }
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : "Untitled recording";

  const ok = await insertRecording({
    slug: body.slug,
    title,
    duration_seconds:
      typeof body.durationSeconds === "number" ? body.durationSeconds : null,
    size_bytes: typeof body.sizeBytes === "number" ? body.sizeBytes : null,
  });

  if (!ok) {
    return Response.json(
      { error: "Could not save recording metadata." },
      { status: 503 }
    );
  }
  return Response.json({ ok: true }, { status: 201 });
}
