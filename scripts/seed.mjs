// Seeds the versioned files in seed/ into Supabase for one user. Idempotent:
// rows are keyed by (user_id, slug | rule_id | rotation_index) and re-seeding
// updates definitions without touching user state (habit states, metric
// targets already personalized, logged data).
//
// Usage: node scripts/seed.mjs [--user=<auth-user-uuid>]
import { readFileSync } from "node:fs";
import { connect } from "./lib/db.mjs";

const constraints = JSON.parse(readFileSync("seed/constraints.json", "utf8"));
const exercises = JSON.parse(readFileSync("seed/exercises.json", "utf8"));
const habits = JSON.parse(readFileSync("seed/habits.json", "utf8"));
const metrics = JSON.parse(readFileSync("seed/metrics.json", "utf8"));

const userArg = process.argv.find((a) => a.startsWith("--user="))?.slice(7);

const client = await connect();

let userId = userArg;
if (!userId) {
  const { rows } = await client.query(
    `select id from auth.users order by created_at asc`
  );
  if (rows.length === 0) {
    console.error("No auth user exists; create the account first.");
    process.exit(1);
  }
  if (rows.length > 1 && !userArg) {
    console.error(`Multiple auth users; pass --user=<uuid>. Found ${rows.length}.`);
    process.exit(1);
  }
  userId = rows[0].id;
}
console.log(`Seeding for user ${userId}`);

await client.query("begin");
try {
  // Constraint rules -------------------------------------------------------
  for (const rule of constraints.rules) {
    await client.query(
      `insert into public.constraint_rules (user_id, rule_id, description, predicate, seed_version)
       values ($1, $2, $3, $4, $5)
       on conflict (user_id, rule_id) do update
         set description = excluded.description,
             predicate = excluded.predicate,
             seed_version = excluded.seed_version`,
      [userId, rule.rule_id, rule.description, JSON.stringify(rule.predicate), constraints.version]
    );
  }
  console.log(`constraint_rules: ${constraints.rules.length}`);

  // Exercises ---------------------------------------------------------------
  for (const e of exercises.exercises) {
    await client.query(
      `insert into public.exercises
         (user_id, name, slug, equipment, movement_pattern, loading_axis,
          required_position, joint_range, flags, substitution_slug, is_fixture, seed_version)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (user_id, slug) where slug is not null do update
         set name = excluded.name,
             equipment = excluded.equipment,
             movement_pattern = excluded.movement_pattern,
             loading_axis = excluded.loading_axis,
             required_position = excluded.required_position,
             joint_range = excluded.joint_range,
             flags = excluded.flags,
             substitution_slug = excluded.substitution_slug,
             is_fixture = excluded.is_fixture,
             seed_version = excluded.seed_version`,
      [
        userId, e.name, e.slug, e.equipment, e.movement_pattern, e.loading_axis,
        e.required_position, e.joint_range, JSON.stringify(e.flags), e.substitution,
        e.fixture, exercises.version,
      ]
    );
  }
  console.log(`exercises: ${exercises.exercises.length}`);

  // Sessions (rotation templates) --------------------------------------------
  const { rows: exRows } = await client.query(
    `select id, slug from public.exercises where user_id = $1 and slug is not null`,
    [userId]
  );
  const idBySlug = new Map(exRows.map((r) => [r.slug, r.id]));

  for (const session of exercises.sessions) {
    const items = session.items.map((item) => {
      const exercise_id = idBySlug.get(item.slug);
      if (!exercise_id) throw new Error(`Unknown exercise slug in session: ${item.slug}`);
      return {
        exercise_id,
        prescribed_sets: item.sets,
        rep_min: item.rep_min,
        rep_max: item.rep_max,
      };
    });
    const existing = await client.query(
      `select id from public.exercise_templates where user_id = $1 and rotation_index = $2`,
      [userId, session.rotation_index]
    );
    if (existing.rows.length > 0) {
      await client.query(
        `update public.exercise_templates
           set name = $1, exercises = $2, seed_version = $3
         where id = $4`,
        [session.name, JSON.stringify(items), exercises.version, existing.rows[0].id]
      );
    } else {
      await client.query(
        `insert into public.exercise_templates (user_id, name, exercises, rotation_index, seed_version)
         values ($1, $2, $3, $4, $5)`,
        [userId, session.name, JSON.stringify(items), session.rotation_index, exercises.version]
      );
    }
  }
  console.log(`sessions: ${exercises.sessions.length}`);

  // Habits -------------------------------------------------------------------
  for (const h of habits.habits) {
    await client.query(
      `insert into public.habits
         (user_id, slug, name, decay_window_days, advance_rule, floor_action,
          state_meanings, config, sort_order, seed_version)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       on conflict (user_id, slug) do update
         set name = excluded.name,
             decay_window_days = excluded.decay_window_days,
             advance_rule = excluded.advance_rule,
             floor_action = excluded.floor_action,
             state_meanings = excluded.state_meanings,
             config = excluded.config,
             sort_order = excluded.sort_order,
             seed_version = excluded.seed_version`,
      [
        userId, h.slug, h.name, h.decay_window_days, h.advance_rule, h.floor_action,
        JSON.stringify(h.state_meanings), JSON.stringify(h.config), h.sort_order, habits.version,
      ]
    );
  }
  console.log(`habits: ${habits.habits.length}`);

  // Metrics --------------------------------------------------------------------
  for (const m of metrics.metrics) {
    await client.query(
      `insert into public.metric_definitions
         (user_id, slug, name, unit, direction, target, sort_order, seed_version)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (user_id, slug) do update
         set name = excluded.name,
             unit = excluded.unit,
             direction = excluded.direction,
             sort_order = excluded.sort_order,
             seed_version = excluded.seed_version`,
      [userId, m.slug, m.name, m.unit, m.direction, JSON.stringify(m.target), m.sort_order, metrics.version]
    );
  }
  console.log(`metric_definitions: ${metrics.metrics.length}`);

  // Rotation state ----------------------------------------------------------------
  await client.query(
    `insert into public.rotation_state (user_id, position)
     values ($1, 0)
     on conflict (user_id) do nothing`,
    [userId]
  );

  // User settings row so Today has defaults without a first-write race.
  await client.query(
    `insert into public.user_settings (user_id)
     values ($1)
     on conflict (user_id) do nothing`,
    [userId]
  );

  await client.query("commit");
  console.log("Seed complete.");
} catch (e) {
  await client.query("rollback");
  console.error("Seed FAILED:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
