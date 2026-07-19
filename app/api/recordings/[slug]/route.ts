import { deleteRecordingRow, renameRecording } from "@/lib/db";
import { deleteVideoAsset } from "@/lib/cloudinary-server";

const SLUG_RE = /^[a-z0-9]{8,24}$/;

// NOTE: these management routes are unauthenticated until the login feature
// ships (deliberately last on the roadmap); they will be gated to the
// recording's owner then.

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug." }, { status: 400 });
  }
  let body: { title?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.title !== "string" || !body.title.trim()) {
    return Response.json({ error: "Title is required." }, { status: 400 });
  }
  const ok = await renameRecording(slug, body.title.trim().slice(0, 120));
  return ok
    ? Response.json({ ok: true })
    : Response.json({ error: "Rename failed." }, { status: 503 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
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
