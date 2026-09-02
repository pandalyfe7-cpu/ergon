-- Intake tables: profile, constraints, goals, barriers, motivators.
-- Guidance stays gated until user_profile.onboarding_step >= 4. A missing
-- profile is unknown, not a default: no backfill, no insert of a step-0 row.

create table public.user_profile (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  age_band text,
  height_cm numeric,
  weight_kg numeric,
  training_years numeric,
  baseline_weekly_days int,
  capacity jsonb not null default '{}'::jsonb,
  onboarding_step int not null default 0,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_constraints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'injury', 'surgery', 'hardware', 'joint', 'systemic', 'cognitive', 'other'
  )),
  label text not null,
  body_region text,
  laterality text check (laterality in ('left', 'right', 'bilateral', 'n/a')),
  severity text check (severity in ('mild', 'moderate', 'severe')),
  blocks_patterns text[] not null default '{}',
  load_cap_pct numeric,
  rom_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rank int not null,
  outcome text not null,
  target_date date,
  metric text,
  created_at timestamptz not null default now()
);

create table public.user_barriers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  code text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint user_barriers_code_valid check (code in (
    'time_scarcity',
    'energy_crash',
    'pain_flare',
    'travel',
    'motivation_drop',
    'all_or_nothing',
    'schedule_chaos',
    'equipment_access',
    'social_pressure',
    'boredom',
    'injury_fear',
    'cost'
  )),
  constraint user_barriers_unique unique (user_id, code)
);

create table public.user_motivators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  code text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint user_motivators_code_valid check (code in (
    'mastery',
    'autonomy',
    'competition',
    'appearance',
    'health_longevity',
    'social_connection',
    'routine_comfort',
    'novelty',
    'proving_others_wrong',
    'capability_restoration'
  )),
  constraint user_motivators_unique unique (user_id, code)
);

do $$
declare
  target text;
begin
  foreach target in array array[
    'user_profile',
    'user_constraints',
    'user_goals',
    'user_barriers',
    'user_motivators'
  ]
  loop
    execute format('alter table public.%I enable row level security', target);
    execute format(
      'create policy owner_all_access on public.%I '
      'for all to authenticated '
      'using (user_id = (select auth.uid())) '
      'with check (user_id = (select auth.uid()))',
      target
    );
  end loop;
end
$$;
