import { incrementViews } from "@/lib/db";

const SLUG_RE = /^[a-z0-9]{8,24}$/;

/** Fired by the viewer page on load; best-effort view counting. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug." }, { status: 400 });
  }
  await incrementViews(slug);
  return Response.json({ ok: true });
}
