-- RecordFlow schema — run this once in the Supabase SQL Editor.
-- (Dashboard > SQL Editor > New query > paste > Run)

create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null default 'Untitled recording',
  duration_seconds double precision,
  size_bytes bigint,
  views bigint not null default 0,
  -- Empty until the login feature ships; then recordings belong to users.
  user_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- RLS on with no policies: the browser (anon key) can read/write nothing.
-- Our server routes use the service-role key, which bypasses RLS.
alter table public.recordings enable row level security;

-- Atomic view counter.
create or replace function public.increment_views(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.recordings set views = views + 1 where slug = p_slug;
$$;
