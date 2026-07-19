import { insertRecording } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getUser } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z0-9]{8,24}$/;

/**
 * Persist recording metadata. Called with status "processing" when an
 * instant link is created at upload start, or "ready" for direct saves.
 */
export async function POST(request: Request) {
  if (!rateLimit(`recordings:${clientIp(request)}`, 20, 60 * 60 * 1000)) {
    return tooManyRequests();
  }
  const user = await getUser();
  if (!user) {
    return Response.json(
      { error: "Log in to upload and share recordings." },
      { status: 401 }
    );
  }

  let body: {
    slug?: unknown;
    title?: unknown;
    durationSeconds?: unknown;
    sizeBytes?: unknown;
    status?: unknown;
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
  const status = body.status === "processing" ? "processing" : "ready";

  const ok = await insertRecording({
    slug: body.slug,
    title,
    duration_seconds:
      typeof body.durationSeconds === "number" ? body.durationSeconds : null,
    size_bytes: typeof body.sizeBytes === "number" ? body.sizeBytes : null,
    status,
    user_id: user.id,
  });

  if (!ok) {
    return Response.json(
      { error: "Could not save recording metadata." },
      { status: 503 }
    );
  }
  return Response.json({ ok: true }, { status: 201 });
}
