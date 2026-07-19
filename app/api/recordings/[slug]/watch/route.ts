import { recordWatch } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const SLUG_RE = /^[a-z0-9]{8,24}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Watch-progress beacon from the viewer player (anonymous, per session). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!rateLimit(`watch:${clientIp(request)}`, 600, 60 * 60 * 1000)) {
    return tooManyRequests();
  }
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug." }, { status: 400 });
  }
  let body: { sessionId?: unknown; seconds?: unknown; duration?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.sessionId !== "string" || !UUID_RE.test(body.sessionId)) {
    return Response.json({ error: "Invalid session." }, { status: 400 });
  }
  if (
    typeof body.seconds !== "number" ||
    body.seconds < 0 ||
    body.seconds > 36_000
  ) {
    return Response.json({ error: "Invalid progress." }, { status: 400 });
  }
  await recordWatch(
    body.sessionId,
    slug,
    Math.round(body.seconds * 10) / 10,
    typeof body.duration === "number" && body.duration > 0
      ? body.duration
      : null
  );
  return Response.json({ ok: true });
}
