-- Run this once in Supabase: SQL Editor > New query > paste > Run
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  url text not null,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);
create table public.checks (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.sites on delete cascade,
  up boolean not null,
  status int,
  ms int,
  checked_at timestamptz not null default now()
);
create index on public.checks (site_id, checked_at desc);

alter table public.sites enable row level security;
alter table public.checks enable row level security;
create policy "own sites" on public.sites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read own checks" on public.checks for select
  using (exists (select 1 from public.sites s where s.id = site_id and s.user_id = auth.uid()));

create view public.site_status with (security_invoker = true) as
  select distinct on (site_id) site_id, up, status, ms, checked_at
  from public.checks order by site_id, checked_at desc;
create view public.site_stats with (security_invoker = true) as
  select site_id,
         round(100.0 * count(*) filter (where up) / count(*), 1) as uptime,
         round(avg(ms) filter (where up)) as avg_ms
  from public.checks where checked_at > now() - interval '24 hours' group by site_id;
