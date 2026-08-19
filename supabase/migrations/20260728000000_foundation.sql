-- Ergon foundation schema.
--
-- Single user. Every row belongs to one auth.users record; row level security
-- restricts all access to that owner. user_id defaults to auth.uid(), so
-- inserts never need to pass it.
--
-- Unit convention: loads and bodyweight in lb, macros in grams, water in ml.
-- Nothing is stored in two units.

create type public.meal_slot as enum ('breakfast', 'lunch', 'dinner', 'snack');


-- Exercises ------------------------------------------------------------------
-- stimulus_weights: { "<muscle_group>": <number> }, keys from MUSCLE_GROUPS in
--   src/lib/types/enums.ts. Not an enum column because the keys live inside
--   jsonb, which Postgres cannot key-check.
-- constraints: [ { "type": "...", <parameters>, "note": "..." } ], shapes from
--   src/lib/types/constraints.ts. Parameters are stored alongside the type so a
--   changed limit is a data edit, not a schema change.

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  stimulus_weights jsonb not null default '{}'::jsonb,
  constraints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint exercises_name_present check (length(btrim(name)) > 0),
  constraint exercises_stimulus_weights_object check (jsonb_typeof(stimulus_weights) = 'object'),
  constraint exercises_constraints_array check (jsonb_typeof(constraints) = 'array')
);


-- Routines -------------------------------------------------------------------
-- exercises: ordered [ { "exercise_id", "prescribed_sets", "rep_min", "rep_max" } ].
--   Array order is display and execution order.

create table public.exercise_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint exercise_templates_name_present check (length(btrim(name)) > 0),
  constraint exercise_templates_exercises_array check (jsonb_typeof(exercises) = 'array')
);


-- Training -------------------------------------------------------------------

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id uuid references public.exercise_templates (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sessions_end_after_start check (ended_at is null or ended_at >= started_at)
);

-- At most one open session at a time; the today tab resumes it rather than
-- offering to start a second.
create unique index sessions_single_open
  on public.sessions (user_id)
  where ended_at is null;

create table public.logged_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  weight_lb numeric(6, 2) not null,
  reps integer not null,
  rpe numeric(3, 1),
  is_warmup boolean not null default false,
  set_order integer not null,
  performed_at timestamptz not null default now(),
  constraint logged_sets_weight_non_negative check (weight_lb >= 0),
  constraint logged_sets_reps_positive check (reps > 0),
  constraint logged_sets_rpe_range check (rpe is null or (rpe >= 1 and rpe <= 10)),
  constraint logged_sets_order_positive check (set_order >= 1)
);


-- Nutrition ------------------------------------------------------------------
-- Macros are stored per one serving. serving_unit labels what one serving is.

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  calories numeric(7, 2) not null,
  protein_g numeric(6, 2) not null,
  carbs_g numeric(6, 2) not null,
  fat_g numeric(6, 2) not null,
  default_serving numeric(6, 2) not null default 1,
  serving_unit text not null default 'serving',
  is_saved boolean not null default false,
  created_at timestamptz not null default now(),
  constraint foods_name_present check (length(btrim(name)) > 0),
  constraint foods_macros_non_negative check (
    calories >= 0 and protein_g >= 0 and carbs_g >= 0 and fat_g >= 0
  ),
  constraint foods_default_serving_positive check (default_serving > 0)
);

create table public.logged_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  meal_slot public.meal_slot not null,
  serving numeric(6, 2) not null,
  eaten_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint logged_meals_serving_positive check (serving > 0)
);

-- Exactly one row per user. The current target applies to every day.
create table public.daily_macro_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  calories numeric(7, 2) not null,
  protein_g numeric(6, 2) not null,
  carbs_g numeric(6, 2) not null,
  fat_g numeric(6, 2) not null,
  constraint daily_macro_targets_non_negative check (
    calories >= 0 and protein_g >= 0 and carbs_g >= 0 and fat_g >= 0
  )
);

-- ingredients: [ { "food_id", "quantity" } ], quantity in servings of that
-- food. Recipe totals are computed on read, never stored.
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  ingredients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint recipes_name_present check (length(btrim(name)) > 0),
  constraint recipes_ingredients_array check (jsonb_typeof(ingredients) = 'array')
);


-- Body -----------------------------------------------------------------------

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount_ml integer not null,
  logged_at timestamptz not null default now(),
  constraint water_logs_amount_positive check (amount_ml > 0)
);

create table public.bodyweight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weight_lb numeric(5, 2) not null,
  logged_at timestamptz not null default now(),
  constraint bodyweight_logs_weight_positive check (weight_lb > 0)
);

-- Exactly one row per user.
create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  weekly_session_target integer not null default 4,
  daily_water_target_ml integer not null default 3000,
  water_increment_ml integer not null default 250,
  constraint user_settings_weekly_target_positive check (weekly_session_target > 0),
  constraint user_settings_water_target_positive check (daily_water_target_ml > 0),
  constraint user_settings_water_increment_positive check (water_increment_ml > 0)
);


-- Indexes --------------------------------------------------------------------
-- Covering the reads later screens do: today's totals, week windows, per
-- exercise history, and per session detail.

create index exercises_user_name on public.exercises (user_id, name);
create index exercise_templates_user on public.exercise_templates (user_id, created_at desc);
create index sessions_user_started on public.sessions (user_id, started_at desc);
create index logged_sets_session on public.logged_sets (session_id, set_order);
create index logged_sets_exercise_performed on public.logged_sets (exercise_id, performed_at desc);
create index logged_sets_user_performed on public.logged_sets (user_id, performed_at desc);
create index foods_user_name on public.foods (user_id, name);
create index foods_saved on public.foods (user_id) where is_saved;
create index logged_meals_user_eaten on public.logged_meals (user_id, eaten_at desc);
create index logged_meals_food on public.logged_meals (food_id);
create index recipes_user on public.recipes (user_id, name);
create index water_logs_user_logged on public.water_logs (user_id, logged_at desc);
create index bodyweight_logs_user_logged on public.bodyweight_logs (user_id, logged_at desc);


-- Row level security ----------------------------------------------------------
-- One policy per table, identical: you can only touch your own rows. Applied in
-- a loop so a new table cannot be added to the list above without one.

do $$
declare
  target text;
begin
  foreach target in array array[
    'exercises',
    'exercise_templates',
    'sessions',
    'logged_sets',
    'foods',
    'logged_meals',
    'daily_macro_targets',
    'recipes',
    'water_logs',
    'bodyweight_logs',
    'user_settings'
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
