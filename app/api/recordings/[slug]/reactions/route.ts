import { addReaction, listReactionCounts } from "@/lib/db";
import { ALLOWED_EMOJI } from "@/lib/engagement";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const SLUG_RE = /^[a-z0-9]{8,24}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug." }, { status: 400 });
  }
  return Response.json({ counts: await listReactionCounts(slug) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!rateLimit(`react:${clientIp(request)}`, 30, 60 * 60 * 1000)) {
    return tooManyRequests();
  }
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug." }, { status: 400 });
  }
  let body: { emoji?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (
    typeof body.emoji !== "string" ||
    !ALLOWED_EMOJI.includes(body.emoji)
  ) {
    return Response.json({ error: "Invalid reaction." }, { status: 400 });
  }
  const ok = await addReaction(slug, body.emoji);
  return ok
    ? Response.json({ ok: true }, { status: 201 })
    : Response.json({ error: "Could not save reaction." }, { status: 503 });
}
