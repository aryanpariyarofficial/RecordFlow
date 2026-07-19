import { deleteComment, getRecordingBySlug } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getUser } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z0-9]{8,24}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Owner-only comment moderation. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  if (!rateLimit(`rec-write:${clientIp(request)}`, 60, 60 * 60 * 1000)) {
    return tooManyRequests();
  }
  const { slug, id } = await params;
  if (!SLUG_RE.test(slug) || !UUID_RE.test(id)) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Log in first." }, { status: 401 });
  }
  const recording = await getRecordingBySlug(slug);
  if (!recording) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  if (recording.user_id && recording.user_id !== user.id) {
    return Response.json({ error: "Not your recording." }, { status: 403 });
  }
  const ok = await deleteComment(id, slug);
  return ok
    ? Response.json({ ok: true })
    : Response.json({ error: "Delete failed." }, { status: 503 });
}
