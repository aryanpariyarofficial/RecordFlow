/**
 * Server-side Cloudinary Admin API helpers (basic auth with the API secret).
 * Never import this from client components.
 */

function credentials(): {
  cloudName: string;
  authHeader: string;
} | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return {
    cloudName,
    authHeader: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
  };
}

export async function deleteVideoAsset(slug: string): Promise<boolean> {
  const creds = credentials();
  if (!creds) return false;
  const publicId = encodeURIComponent(`recordflow/${slug}`);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${creds.cloudName}/resources/video/upload?public_ids[]=${publicId}`,
    { method: "DELETE", headers: { Authorization: creds.authHeader } }
  );
  return res.ok;
}

export interface CloudinaryUsage {
  usedCredits: number;
  limitCredits: number;
  usedPercent: number;
}

export async function getUsage(): Promise<CloudinaryUsage | null> {
  const creds = credentials();
  if (!creds) return null;
  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${creds.cloudName}/usage`,
      {
        headers: { Authorization: creds.authHeader },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return null;
    const body = await res.json();
    const credits = body?.credits;
    if (typeof credits?.usage !== "number" || typeof credits?.limit !== "number") {
      return null;
    }
    return {
      usedCredits: credits.usage,
      limitCredits: credits.limit,
      usedPercent:
        typeof credits.used_percent === "number"
          ? credits.used_percent
          : (credits.usage / credits.limit) * 100,
    };
  } catch {
    return null;
  }
}
