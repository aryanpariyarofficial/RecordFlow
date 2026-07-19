import { cookies } from "next/headers";
import { getRecordingBySlug } from "@/lib/db";
import {
  unlockCookieName,
  unlockCookieValue,
  verifyPassword,
} from "@/lib/passwords";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const SLUG_RE = /^[a-z0-9]{8,24}$/;

/** Verifies a share-link password and remembers the unlock via cookie. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Tight limit: this endpoint is a password oracle.
  if (!rateLimit(`unlock:${clientIp(request)}`, 10, 10 * 60 * 1000)) {
    return tooManyRequests();
  }
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug." }, { status: 400 });
  }
  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.password !== "string" || !body.password) {
    return Response.json({ error: "Password required." }, { status: 400 });
  }

  const row = await getRecordingBySlug(slug);
  if (!row || !row.password_hash) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  if (!verifyPassword(body.password, row.password_hash)) {
    return Response.json({ error: "Wrong password." }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set(
    unlockCookieName(slug),
    unlockCookieValue(slug, row.password_hash),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 12,
      path: "/",
    }
  );
  return Response.json({ ok: true });
}
