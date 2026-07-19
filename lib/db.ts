/**
 * Server-only Supabase access using the service-role key (bypasses RLS).
 * Never import this from client components.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type RecordingStatus = "processing" | "ready";

export interface RecordingRow {
  id: string;
  slug: string;
  title: string;
  duration_seconds: number | null;
  size_bytes: number | null;
  views: number;
  status: RecordingStatus;
  user_id: string | null;
  password_hash: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface CommentRow {
  id: string;
  slug: string;
  author: string;
  body: string;
  at_seconds: number | null;
  created_at: string;
}

let client: SupabaseClient | null = null;

export function getDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export async function insertRecording(row: {
  slug: string;
  title: string;
  duration_seconds: number | null;
  size_bytes: number | null;
  status: RecordingStatus;
  user_id: string;
}): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const { error } = await db.from("recordings").insert(row);
  return !error;
}

export async function updateRecording(
  slug: string,
  fields: Partial<{
    title: string;
    status: RecordingStatus;
    duration_seconds: number;
    password_hash: string | null;
    expires_at: string | null;
  }>
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const { error } = await db.from("recordings").update(fields).eq("slug", slug);
  return !error;
}

export async function getRecordingBySlug(
  slug: string
): Promise<RecordingRow | null> {
  const db = getDb();
  if (!db) return null;
  const { data } = await db
    .from("recordings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as RecordingRow) ?? null;
}

export async function listRecordings(
  userId: string
): Promise<RecordingRow[] | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db
    .from("recordings")
    .select("*")
    // user_id IS NULL covers recordings uploaded before auth existed.
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order("created_at", { ascending: false });
  // error (e.g. table not created yet) is distinguished from an empty library.
  if (error) return null;
  return (data as RecordingRow[]) ?? [];
}

export async function deleteRecordingRow(slug: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const { error } = await db.from("recordings").delete().eq("slug", slug);
  return !error;
}

export async function incrementViews(slug: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.rpc("increment_views", { p_slug: slug });
}

export async function listComments(slug: string): Promise<CommentRow[]> {
  const db = getDb();
  if (!db) return [];
  const { data } = await db
    .from("comments")
    .select("*")
    .eq("slug", slug)
    .order("created_at", { ascending: true })
    .limit(200);
  return (data as CommentRow[]) ?? [];
}

export async function addComment(comment: {
  slug: string;
  author: string;
  body: string;
  at_seconds: number | null;
}): Promise<CommentRow | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db
    .from("comments")
    .insert(comment)
    .select()
    .single();
  return error ? null : (data as CommentRow);
}

export async function listReactionCounts(
  slug: string
): Promise<Record<string, number>> {
  const db = getDb();
  if (!db) return {};
  const { data } = await db
    .from("reactions")
    .select("emoji")
    .eq("slug", slug)
    .limit(5000);
  const counts: Record<string, number> = {};
  for (const row of (data as { emoji: string }[]) ?? []) {
    counts[row.emoji] = (counts[row.emoji] ?? 0) + 1;
  }
  return counts;
}

export async function addReaction(
  slug: string,
  emoji: string
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const { error } = await db.from("reactions").insert({ slug, emoji });
  return !error;
}

export async function deleteComment(
  id: string,
  slug: string
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const { error } = await db
    .from("comments")
    .delete()
    .eq("id", id)
    .eq("slug", slug);
  return !error;
}

export async function recordWatch(
  sessionId: string,
  slug: string,
  seconds: number,
  duration: number | null
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.rpc("record_watch", {
    p_session: sessionId,
    p_slug: slug,
    p_seconds: seconds,
    p_duration: duration,
  });
}

export interface WatchStats {
  plays: number;
  /** 0–100, average of per-session watched fraction; null if unknown. */
  avgPercent: number | null;
}

export async function getWatchStats(
  slugs: string[]
): Promise<Record<string, WatchStats>> {
  const db = getDb();
  const stats: Record<string, WatchStats> = {};
  if (!db || slugs.length === 0) return stats;
  const { data } = await db
    .from("watch_progress")
    .select("slug, seconds, video_duration")
    .in("slug", slugs)
    .limit(10000);
  for (const row of (data as {
    slug: string;
    seconds: number;
    video_duration: number | null;
  }[]) ?? []) {
    const entry = (stats[row.slug] ??= { plays: 0, avgPercent: 0 });
    entry.plays += 1;
    const fraction =
      row.video_duration && row.video_duration > 0
        ? Math.min(1, row.seconds / row.video_duration)
        : null;
    if (fraction === null) {
      entry.avgPercent = entry.avgPercent ?? null;
    } else {
      entry.avgPercent = (entry.avgPercent ?? 0) + fraction * 100;
    }
  }
  for (const entry of Object.values(stats)) {
    if (entry.avgPercent !== null && entry.plays > 0) {
      entry.avgPercent = Math.round(entry.avgPercent / entry.plays);
    }
  }
  return stats;
}
