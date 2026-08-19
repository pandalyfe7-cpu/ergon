-- Per-habit configuration (auto-mark source, sleep-timing bedtime window).
-- jsonb so a new habit mechanism is a data edit, not a schema change.

alter table public.habits
  add column config jsonb not null default '{}'::jsonb;

alter table public.habits
  add constraint habits_config_object check (jsonb_typeof(config) = 'object');
