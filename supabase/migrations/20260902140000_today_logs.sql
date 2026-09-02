-- Today log provenance: habit marks and manual metric numbers.

alter table public.habit_events
  add column rule_id text,
  add column rule_version text,
  add column trace jsonb;

create table public.metric_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  metric_slug text not null,
  log_date date not null,
  value numeric(10, 2) not null,
  rule_id text not null,
  rule_version text not null,
  trace jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint metric_logs_unique unique (user_id, metric_slug, log_date)
);

alter table public.metric_logs enable row level security;

create policy owner_all_access on public.metric_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
