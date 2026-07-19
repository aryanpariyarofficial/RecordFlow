/**
 * In-memory sliding-window rate limiter for API routes.
 *
 * Serverless caveat: state is per warm instance, so this is a deterrent
 * against casual abuse, not a hard guarantee. Good enough until auth ships;
 * swap for a shared store (Upstash/Supabase) if the app grows.
 */

const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function tooManyRequests(): Response {
  return Response.json(
    { error: "Too many requests — try again later." },
    { status: 429 }
  );
}
