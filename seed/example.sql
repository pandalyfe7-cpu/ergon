-- Fake constraint rows for agents and tests. No real medical facts.
-- Owner data belongs in seed/personal.sql (gitignored), never here.

insert into public.user_constraints (
  kind,
  label,
  body_region,
  laterality,
  severity,
  blocks_patterns,
  load_cap_pct,
  rom_notes,
  active
) values
(
  'other',
  'Example: no jumping',
  null,
  'n/a',
  null,
  array['knee_dominant'],
  null,
  'Example note: skip plyometrics in this fake row.',
  true
),
(
  'other',
  'Example: cap overhead load',
  'shoulder',
  'n/a',
  null,
  array['vertical_push'],
  70,
  'Example note: keep overhead work under the load cap.',
  true
),
(
  'other',
  'Example: limited knee flexion',
  'knee',
  'left',
  'mild',
  array['knee_flexion'],
  null,
  'Example note: stay in a pain-free range; this is fake data.',
  true
);
