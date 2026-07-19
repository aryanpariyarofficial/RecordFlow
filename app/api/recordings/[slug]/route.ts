import { deleteRecordingRow, updateRecording } from "@/lib/db";
import { deleteVideoAsset } from "@/lib/cloudinary-server";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const SLUG_RE = /^[a-z0-9]{8,24}$/;

// NOTE: these management routes are unauthenticated until the login feature
// ships (deliberately last on the roadmap); they will be gated to the
// recording's owner then.

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
