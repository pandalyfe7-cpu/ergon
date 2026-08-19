-- Coach decision log ----------------------------------------------------------
-- One row per recommendation the coach tab shows and I act on. Written only;
-- no screen reads it. A later prompt tunes progression by joining what was
-- recommended against what was actually lifted.
--
-- Lifecycle of a row:
--   1. Coach tab writes the recommendation with accepted true or false, plus
--      the override values when I edited it. session_id is null at this point.
--   2. The first session that logs a working set for that exercise claims the
--      newest unclaimed row and fills the performed_* columns as I lift.
--
-- rule is free text on purpose: ProgressionRule in src/lib/training/aim.ts is
-- the source of truth, and a new rule should not need a migration.

create table public.coach_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,

  recommended_weight_lb numeric(6, 2) not null,
  recommended_rep_min integer not null,
  recommended_rep_max integer not null,
  reason text not null,
  rule text not null,

  accepted boolean not null,
  override_weight_lb numeric(6, 2),
  override_rep_min integer,
  override_rep_max integer,

  session_id uuid references public.sessions (id) on delete set null,
  performed_weight_lb numeric(6, 2),
  performed_reps integer,
  performed_sets integer,
  performed_at timestamptz,

  created_at timestamptz not null default now(),

  constraint coach_decisions_reason_present check (length(btrim(reason)) > 0),
  constraint coach_decisions_rule_present check (length(btrim(rule)) > 0),
  constraint coach_decisions_weight_non_negative check (recommended_weight_lb >= 0),
  constraint coach_decisions_rep_range check (
    recommended_rep_min >= 1 and recommended_rep_max >= recommended_rep_min
  ),
  constraint coach_decisions_override_weight_non_negative check (
    override_weight_lb is null or override_weight_lb >= 0
  ),
  constraint coach_decisions_override_rep_range check (
    (override_rep_min is null and override_rep_max is null)
    or (override_rep_min >= 1 and override_rep_max >= override_rep_min)
  ),
  constraint coach_decisions_performed_non_negative check (
    (performed_weight_lb is null or performed_weight_lb >= 0)
    and (performed_reps is null or performed_reps > 0)
    and (performed_sets is null or performed_sets > 0)
  )
);

-- The coach tab asks "does this exercise already have an unclaimed decision",
-- and saveSet asks "which decision does this set belong to". Same index.
create index coach_decisions_user_exercise
  on public.coach_decisions (user_id, exercise_id, created_at desc);

create index coach_decisions_unclaimed
  on public.coach_decisions (user_id, exercise_id, created_at desc)
  where session_id is null;

alter table public.coach_decisions enable row level security;

create policy owner_all_access on public.coach_decisions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
