/**
 * Server-only Supabase access using the service-role key (bypasses RLS).
 * Never import this from client components.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface RecordingRow {
  id: string;
  slug: string;
  title: string;
  duration_seconds: number | null;
  size_bytes: number | null;
  views: number;
  user_id: string | null;
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
}): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const { error } = await db.from("recordings").insert(row);
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

export async function listRecordings(): Promise<RecordingRow[] | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db
    .from("recordings")
    .select("*")
    .order("created_at", { ascending: false });
  // error (e.g. table not created yet) is distinguished from an empty library.
  if (error) return null;
  return (data as RecordingRow[]) ?? [];
}

export async function renameRecording(
  slug: string,
  title: string
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const { error } = await db
    .from("recordings")
    .update({ title })
    .eq("slug", slug);
  return !error;
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
