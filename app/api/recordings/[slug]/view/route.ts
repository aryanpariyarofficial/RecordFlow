import { incrementViews } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const SLUG_RE = /^[a-z0-9]{8,24}$/;

/** Fired by the viewer page on load; best-effort view counting. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!rateLimit(`view:${clientIp(request)}`, 120, 60 * 60 * 1000)) {
    return tooManyRequests();
  }
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug." }, { status: 400 });
  }
  await incrementViews(slug);
  return Response.json({ ok: true });
}
