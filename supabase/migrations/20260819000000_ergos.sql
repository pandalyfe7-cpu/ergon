-- ERGOS schema: rotation, constraint tags, constraint table, habits, metrics,
-- morning entries, recommendations, engine weights.
--
-- Conventions follow the foundation migration: single owner via
-- user_id default auth.uid(), RLS owner_all_access on every table, units named
-- in column names, local calendar dates stored as `date` computed app-side
-- from the user's time zone.

-- Exercise constraint tags ----------------------------------------------------
-- The gate reads these. Text instead of enums so a new pattern is a data edit,
-- not a migration. Allowed values are validated at the seed/write boundary in
-- TypeScript (src/lib/engine/tags.ts).
--
-- flags: jsonb array of strings, e.g. ["valsalva_risk","impact"].
-- is_fixture: contraindicated gate-test fixtures; never recommendable, kept so
-- tests can prove the gate rejects them.

alter table public.exercises
  add column slug text,
  add column equipment text,
  add column movement_pattern text,
  add column loading_axis text,
  add column required_position text,
  add column joint_range text,
  add column flags jsonb not null default '[]'::jsonb,
  add column substitution_slug text,
  add column is_fixture boolean not null default false,
  add column seed_version text;

alter table public.exercises
  add constraint exercises_flags_array check (jsonb_typeof(flags) = 'array');

create unique index exercises_user_slug
  on public.exercises (user_id, slug)
  where slug is not null;

-- Rotation --------------------------------------------------------------------
-- The six-session PPL rotation lives on exercise_templates via rotation_index
-- (0 = Push A ... 5 = Legs B). rotation_state points at whichever is next.

alter table public.exercise_templates
  add column rotation_index integer,
  add column seed_version text;

alter table public.exercise_templates
  add constraint exercise_templates_rotation_range
    check (rotation_index is null or (rotation_index >= 0 and rotation_index <= 5));

create unique index exercise_templates_rotation
  on public.exercise_templates (user_id, rotation_index)
  where rotation_index is not null;

create table public.rotation_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint rotation_state_position_range check (position >= 0 and position <= 5)
);

-- Constraint table --------------------------------------------------------------
-- The five rules the gate enforces. predicate is machine-readable and consumed
-- by the pure gate function; description is what Settings shows.

create table public.constraint_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rule_id text not null,
  description text not null,
  predicate jsonb not null,
  active boolean not null default true,
  seed_version text,
  created_at timestamptz not null default now(),
  constraint constraint_rules_rule_id_present check (length(btrim(rule_id)) > 0),
  constraint constraint_rules_unique unique (user_id, rule_id)
);

-- Habits ------------------------------------------------------------------------
-- Four-state growth model: build / hold / recover / dormant. Marks land in
-- habit_events; state transitions are events too, so the model is auditable.

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  state text not null default 'build',
  state_changed_at timestamptz not null default now(),
  decay_window_days integer not null,
  advance_rule text not null,
  floor_action text not null,
  state_meanings jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  seed_version text,
  created_at timestamptz not null default now(),
  constraint habits_state_valid check (state in ('build', 'hold', 'recover', 'dormant')),
  constraint habits_decay_positive check (decay_window_days > 0),
  constraint habits_unique unique (user_id, slug)
);

create table public.habit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  event_type text not null,
  event_date date not null,
  from_state text,
  to_state text,
  note text,
  created_at timestamptz not null default now(),
  constraint habit_events_type_valid
    check (event_type in ('completed', 'floor', 'state_change', 'resumed'))
);

-- One completion (full or floor) per habit per local day.
create unique index habit_events_one_mark_per_day
  on public.habit_events (habit_id, event_date)
  where event_type in ('completed', 'floor');

create index habit_events_habit_date on public.habit_events (habit_id, event_date desc);

-- Metrics -------------------------------------------------------------------------
-- Definitions only; readings come from existing tables (bodyweight_logs,
-- logged_meals, sessions) and morning_entries. target shapes:
--   {"type":"static","floor":155,"ceiling":165}
--   {"type":"derived_protein","g_per_lb":1.0,"ceiling_offset":30,
--    "floor":160,"ceiling":190,"source_weight_lb":null,"computed_at":null}
-- Derived targets are recomputed weekly app-side from the 7-day average
-- bodyweight; the computed values and their source are stored back here so
-- Settings can show why the target changed.

create table public.metric_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  unit text not null,
  direction text not null,
  target jsonb not null,
  sort_order integer not null default 0,
  seed_version text,
  created_at timestamptz not null default now(),
  constraint metric_definitions_direction_valid
    check (direction in ('up', 'down', 'into_band')),
  constraint metric_definitions_unique unique (user_id, slug)
);

-- Morning entry ---------------------------------------------------------------------
-- One per local day: sleep hours, subjective quality (doubles as the readiness
-- metric), optional bed time (sleep-timing habit), and time available today.

create table public.morning_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null,
  sleep_hours numeric(3, 1) not null,
  sleep_quality integer not null,
  bed_time time,
  time_available_min integer,
  created_at timestamptz not null default now(),
  constraint morning_entries_sleep_range check (sleep_hours >= 0 and sleep_hours <= 24),
  constraint morning_entries_quality_range check (sleep_quality >= 1 and sleep_quality <= 10),
  constraint morning_entries_time_positive
    check (time_available_min is null or time_available_min > 0),
  constraint morning_entries_unique unique (user_id, entry_date)
);

-- Recommendations ----------------------------------------------------------------------
-- One row per distinct recommendation per local day, identified by
-- (rec_date, action_kind, action_ref). The engine upserts on refresh, so a
-- re-render updates scores in place instead of growing the table. Status
-- changes are the feedback loop; rule_ids and trace make every row traceable.

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rec_date date not null,
  slot integer not null,
  action_kind text not null,
  action_ref text not null default '',
  title text not null,
  reason text not null,
  est_minutes integer not null,
  moves text,
  score numeric(8, 3) not null,
  rule_ids text[] not null,
  trace jsonb not null default '[]'::jsonb,
  engine_version text not null,
  seed_versions jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  status_at timestamptz,
  dismiss_reason text,
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  constraint recommendations_kind_valid
    check (action_kind in ('session', 'habit', 'recovery', 'rest', 'metric')),
  constraint recommendations_status_valid
    check (status in ('active', 'accepted', 'dismissed', 'snoozed', 'expired')),
  constraint recommendations_slot_range check (slot >= 0 and slot <= 3),
  constraint recommendations_unique unique (user_id, rec_date, action_kind, action_ref)
);

create index recommendations_user_date on public.recommendations (user_id, rec_date desc);

-- Engine weights --------------------------------------------------------------------------
-- Owner-editable scoring weights. Defaults live in code
-- (src/lib/engine/weights.ts); a row exists only after the first Settings save.

create table public.engine_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  weights jsonb not null,
  updated_at timestamptz not null default now()
);

-- Day defaults -------------------------------------------------------------------------------

alter table public.user_settings
  add column default_time_available_min integer not null default 60;

alter table public.user_settings
  add constraint user_settings_time_available_positive
    check (default_time_available_min > 0);

-- Row level security ---------------------------------------------------------------------------

do $$
declare
  target text;
begin
  foreach target in array array[
    'rotation_state',
    'constraint_rules',
    'habits',
    'habit_events',
    'metric_definitions',
    'morning_entries',
    'recommendations',
    'engine_weights'
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
