-- Intake dimension scores with provenance for onboarding.

create table public.intake_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dimension_kind text not null check (dimension_kind in ('barrier', 'motivator')),
  dimension_code text not null,
  score numeric(5, 2) not null check (score >= 0 and score <= 100),
  rule_id text not null,
  rule_version text not null,
  trace jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint intake_scores_unique unique (user_id, dimension_kind, dimension_code)
);

alter table public.intake_scores enable row level security;

create policy owner_all_access on public.intake_scores
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
