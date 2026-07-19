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
