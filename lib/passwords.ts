/**
 * Server-only helpers for password-protected share links.
 *
 * Passwords are scrypt-hashed (salt:hash hex). Unlocks are remembered with
 * an HttpOnly cookie holding an HMAC bound to the slug AND the current
 * password hash — changing the password invalidates every earlier unlock.
 *
 * Note: this gates the viewer *page*. The underlying CDN file URL remains
 * unguessable but technically public (documented product tradeoff).
 */

import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

function appSecret(): string {
  // Derived from a server-only secret; never sent to clients.
  return `rf-unlock:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-secret"}`;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

export function unlockCookieName(slug: string): string {
  return `rf_unlock_${slug}`;
}

export function unlockCookieValue(slug: string, passwordHash: string): string {
  return createHmac("sha256", appSecret())
    .update(`${slug}:${passwordHash}`)
    .digest("hex");
}

export function isUnlockCookieValid(
  cookieValue: string | undefined,
  slug: string,
  passwordHash: string
): boolean {
  if (!cookieValue) return false;
  const expected = unlockCookieValue(slug, passwordHash);
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
