-- RecordFlow schema — run this once in the Supabase SQL Editor.
-- (Dashboard > SQL Editor > New query > paste > Run)
-- Safe to re-run: every statement is idempotent.

create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null default 'Untitled recording',
  duration_seconds double precision,
  size_bytes bigint,
  views bigint not null default 0,
  -- 'processing' while the background upload runs; 'ready' once playable.
  status text not null default 'ready' check (status in ('processing', 'ready')),
  -- Empty until the login feature ships; then recordings belong to users.
  user_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- Upgrade path for tables created before the status column existed.
alter table public.recordings
  add column if not exists status text not null default 'ready';

-- Phase 4: link protection.
alter table public.recordings add column if not exists password_hash text;
alter table public.recordings add column if not exists expires_at timestamptz;

-- Phase 4: viewer engagement.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.recordings (slug) on delete cascade,
  author text not null default 'Anonymous',
  body text not null,
  at_seconds double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.recordings (slug) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_slug_idx on public.comments (slug);
create index if not exists reactions_slug_idx on public.reactions (slug);

-- Watch-through analytics: one row per anonymous viewing session,
-- holding the furthest point reached.
create table if not exists public.watch_progress (
  session_id uuid primary key,
  slug text not null references public.recordings (slug) on delete cascade,
  seconds double precision not null default 0,
  video_duration double precision,
  updated_at timestamptz not null default now()
);

create index if not exists watch_progress_slug_idx on public.watch_progress (slug);

create or replace function public.record_watch(
  p_session uuid,
  p_slug text,
  p_seconds double precision,
  p_duration double precision
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.watch_progress (session_id, slug, seconds, video_duration)
  values (p_session, p_slug, p_seconds, p_duration)
  on conflict (session_id) do update
    set seconds = greatest(public.watch_progress.seconds, excluded.seconds),
        video_duration = coalesce(excluded.video_duration, public.watch_progress.video_duration),
        updated_at = now();
$$;

-- RLS on with no policies: the browser (anon key) can read/write nothing.
-- Our server routes use the service-role key, which bypasses RLS.
alter table public.recordings enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.watch_progress enable row level security;

-- Atomic view counter.
create or replace function public.increment_views(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.recordings set views = views + 1 where slug = p_slug;
$$;
