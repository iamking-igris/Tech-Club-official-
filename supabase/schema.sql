-- Tech Club Identity — Supabase schema (no auth required for V1)
-- Run this in the Supabase SQL Editor once.

-- Members
create table if not exists public.members (
  uid uuid primary key default gen_random_uuid(),
  member_id text not null unique,
  name text not null,
  role text not null default 'Member',
  session text not null default '2026 / 2027',
  status text not null default 'active'
    check (status in ('active', 'suspended', 'revoked')),
  card_status text not null default 'issued'
    check (card_status in ('none', 'issued', 'reissued', 'revoked')),
  photo text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  card_issued_at timestamptz,
  last_verified_at timestamptz,
  archived boolean not null default false
);

create index if not exists members_member_id_idx on public.members (member_id);
create index if not exists members_archived_idx on public.members (archived);
create index if not exists members_status_idx on public.members (status);

-- Activity log
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  member_id text not null,
  member_name text not null,
  detail text,
  timestamp timestamptz not null default now()
);

create index if not exists activities_timestamp_idx on public.activities (timestamp desc);

-- Club settings (single row)
create table if not exists public.club_settings (
  id int primary key default 1 check (id = 1),
  club_name text not null default 'Tech Club',
  current_session text not null default '2026 / 2027',
  default_role text not null default 'Member',
  next_id_counter int not null default 0
);

insert into public.club_settings (id, club_name, current_session, default_role, next_id_counter)
values (1, 'Tech Club', '2026 / 2027', 'Member', 0)
on conflict (id) do nothing;

-- Open access for internal tool (no auth). Tighten RLS later if needed.
alter table public.members enable row level security;
alter table public.activities enable row level security;
alter table public.club_settings enable row level security;

drop policy if exists "members_all" on public.members;
create policy "members_all" on public.members for all using (true) with check (true);

drop policy if exists "activities_all" on public.activities;
create policy "activities_all" on public.activities for all using (true) with check (true);

drop policy if exists "settings_all" on public.club_settings;
create policy "settings_all" on public.club_settings for all using (true) with check (true);
