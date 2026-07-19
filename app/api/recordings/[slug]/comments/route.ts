import { addComment, getRecordingBySlug, listComments } from "@/lib/db";
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
  const comments = await listComments(slug);
  return Response.json({
    comments: comments.map((c) => ({
      id: c.id,
      author: c.author,
      body: c.body,
      atSeconds: c.at_seconds,
      createdAt: c.created_at,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!rateLimit(`comment:${clientIp(request)}`, 15, 60 * 60 * 1000)) {
    return tooManyRequests();
  }
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug." }, { status: 400 });
  }
  let body: { author?: unknown; body?: unknown; atSeconds?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text || text.length > 1000) {
    return Response.json(
      { error: "Comment must be 1–1000 characters." },
      { status: 400 }
    );
  }
  const recording = await getRecordingBySlug(slug);
  if (!recording) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const comment = await addComment({
    slug,
    author:
      typeof body.author === "string" && body.author.trim()
        ? body.author.trim().slice(0, 40)
        : "Anonymous",
    body: text,
    at_seconds:
      typeof body.atSeconds === "number" && body.atSeconds >= 0
        ? Math.round(body.atSeconds * 10) / 10
        : null,
  });
  if (!comment) {
    return Response.json({ error: "Could not save comment." }, { status: 503 });
  }
  return Response.json(
    {
      comment: {
        id: comment.id,
        author: comment.author,
        body: comment.body,
        atSeconds: comment.at_seconds,
        createdAt: comment.created_at,
      },
    },
    { status: 201 }
  );
}
