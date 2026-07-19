import {
  deleteRecordingRow,
  getRecordingBySlug,
  updateRecording,
} from "@/lib/db";
import { deleteVideoAsset } from "@/lib/cloudinary-server";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getUser } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z0-9]{8,24}$/;

/**
 * Owner check: the signed-in user must own the recording. Rows with a null
 * user_id predate auth and are treated as owned by any signed-in user.
 */
async function authorize(
  slug: string
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const user = await getUser();
  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: "Log in first." }, { status: 401 }),
    };
  }
  const row = await getRecordingBySlug(slug);
  if (!row) {
    return {
      ok: false,
      response: Response.json({ error: "Not found." }, { status: 404 }),
    };
  }
  if (row.user_id && row.user_id !== user.id) {
    return {
      ok: false,
      response: Response.json({ error: "Not your recording." }, { status: 403 }),
    };
  }
  return { ok: true };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!rateLimit(`rec-write:${clientIp(request)}`, 60, 60 * 60 * 1000)) {
    return tooManyRequests();
  }
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug." }, { status: 400 });
  }
  const auth = await authorize(slug);
  if (!auth.ok) return auth.response;
  let body: { title?: unknown; status?: unknown; durationSeconds?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const fields: Partial<{
    title: string;
    status: "processing" | "ready";
    duration_seconds: number;
  }> = {};
  if (typeof body.title === "string" && body.title.trim()) {
    fields.title = body.title.trim().slice(0, 120);
  }
  if (body.status === "ready" || body.status === "processing") {
    fields.status = body.status;
  }
  if (typeof body.durationSeconds === "number" && body.durationSeconds >= 0) {
    fields.duration_seconds = body.durationSeconds;
  }
  if (Object.keys(fields).length === 0) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }

  const ok = await updateRecording(slug, fields);
  return ok
    ? Response.json({ ok: true })
    : Response.json({ error: "Update failed." }, { status: 503 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!rateLimit(`rec-write:${clientIp(request)}`, 60, 60 * 60 * 1000)) {
    return tooManyRequests();
  }
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug." }, { status: 400 });
  }
  const auth = await authorize(slug);
  if (!auth.ok) return auth.response;
  // Remove the video file first; only drop the metadata row if that worked,
  // so a failed Cloudinary call never strands an invisible asset.
  const assetGone = await deleteVideoAsset(slug);
  if (!assetGone) {
    return Response.json(
      { error: "Could not delete the video file." },
      { status: 502 }
    );
  }
  await deleteRecordingRow(slug);
  return Response.json({ ok: true });
}
