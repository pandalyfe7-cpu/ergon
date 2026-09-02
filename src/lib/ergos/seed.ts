import exercisesSeed from "../../../seed/exercises.json";
import habitsSeed from "../../../seed/habits.json";
import metricsSeed from "../../../seed/metrics.json";

import type { createClient } from "@/lib/supabase/server";
import type {
  ExerciseFlag,
  HabitConfig,
  JointRange,
  LoadingAxis,
  MetricTarget,
  MovementPattern,
  RequiredPosition,
} from "@/lib/types";

type MetricDirection = "up" | "down" | "into_band";
type Client = Awaited<ReturnType<typeof createClient>>;

function fail(table: string, message: string | undefined): never {
  throw new Error(`Seed ${table}: ${message ?? "unknown error"}`);
}

/**
 * Idempotent first-login seed. Uses the caller's RLS session so it works on
 * Vercel without a service role. `rotation_state` is written last and used as
 * the "already seeded" marker.
 *
 * Constraint rules from seed/constraints.json are not seeded here; owner rows
 * load from seed/personal.sql when chosen. New users start with none.
 */
export async function ensureSeeded(supabase: Client): Promise<void> {
  const { data: rotation } = await supabase
    .from("rotation_state")
    .select("user_id")
    .maybeSingle();
  if (rotation) return;

  const seedVersion = {
    exercises: exercisesSeed.version,
    habits: habitsSeed.version,
    metrics: metricsSeed.version,
  };

  const { data: existingExercises } = await supabase.from("exercises").select("id, slug");
  const exerciseIdBySlug = new Map(
    (existingExercises ?? []).flatMap((row) =>
      row.slug ? [[row.slug, row.id] as const] : [],
    ),
  );

  for (const exercise of exercisesSeed.exercises) {
    const row = {
      name: exercise.name,
      slug: exercise.slug,
      equipment: exercise.equipment,
      movement_pattern: exercise.movement_pattern as MovementPattern,
      loading_axis: exercise.loading_axis as LoadingAxis,
      required_position: exercise.required_position as RequiredPosition,
      joint_range: exercise.joint_range as JointRange,
      flags: (exercise.flags ?? []) as ExerciseFlag[],
      substitution_slug: exercise.substitution,
      is_fixture: exercise.fixture,
      seed_version: seedVersion.exercises,
    };
    const existingId = exerciseIdBySlug.get(exercise.slug);
    if (existingId) {
      const { error } = await supabase.from("exercises").update(row).eq("id", existingId);
      if (error) fail("exercises", error.message);
    } else {
      const { data, error } = await supabase.from("exercises").insert(row).select("id").single();
      if (error) fail("exercises", error.message);
      exerciseIdBySlug.set(exercise.slug, data.id);
    }
  }

  const { data: templates } = await supabase
    .from("exercise_templates")
    .select("id, rotation_index")
    .not("rotation_index", "is", null);
  const templateIdByIndex = new Map(
    (templates ?? []).flatMap((row) =>
      row.rotation_index === null ? [] : [[row.rotation_index, row.id] as const],
    ),
  );

  for (const session of exercisesSeed.sessions) {
    const items = session.items.map((item) => {
      const exercise_id = exerciseIdBySlug.get(item.slug);
      if (!exercise_id) throw new Error(`Unknown exercise slug in session: ${item.slug}`);
      return {
        exercise_id,
        prescribed_sets: item.sets,
        rep_min: item.rep_min,
        rep_max: item.rep_max,
      };
    });
    const existingId = templateIdByIndex.get(session.rotation_index);
    if (existingId) {
      const { error } = await supabase
        .from("exercise_templates")
        .update({
          name: session.name,
          exercises: items,
          seed_version: seedVersion.exercises,
        })
        .eq("id", existingId);
      if (error) fail("exercise_templates", error.message);
    } else {
      const { error } = await supabase.from("exercise_templates").insert({
        name: session.name,
        exercises: items,
        rotation_index: session.rotation_index,
        seed_version: seedVersion.exercises,
      });
      if (error) fail("exercise_templates", error.message);
    }
  }

  for (const habit of habitsSeed.habits) {
    const { error } = await supabase.from("habits").upsert(
      {
        slug: habit.slug,
        name: habit.name,
        decay_window_days: habit.decay_window_days,
        advance_rule: habit.advance_rule,
        floor_action: habit.floor_action,
        state_meanings: habit.state_meanings,
        config: habit.config as HabitConfig,
        sort_order: habit.sort_order,
        seed_version: seedVersion.habits,
      },
      { onConflict: "user_id,slug" },
    );
    if (error) fail("habits", error.message);
  }

  for (const metric of metricsSeed.metrics) {
    const { data: existing } = await supabase
      .from("metric_definitions")
      .select("id")
      .eq("slug", metric.slug)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("metric_definitions")
        .update({
          name: metric.name,
          unit: metric.unit,
          direction: metric.direction as MetricDirection,
          sort_order: metric.sort_order,
          seed_version: seedVersion.metrics,
        })
        .eq("id", existing.id);
      if (error) fail("metric_definitions", error.message);
    } else {
      const { error } = await supabase.from("metric_definitions").insert({
        slug: metric.slug,
        name: metric.name,
        unit: metric.unit,
        direction: metric.direction as MetricDirection,
        target: metric.target as MetricTarget,
        sort_order: metric.sort_order,
        seed_version: seedVersion.metrics,
      });
      if (error) fail("metric_definitions", error.message);
    }
  }

  const { error: settingsError } = await supabase.from("user_settings").upsert(
    {},
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  if (settingsError) fail("user_settings", settingsError.message);

  const { error: rotationError } = await supabase.from("rotation_state").upsert(
    { position: 0 },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  if (rotationError) fail("rotation_state", rotationError.message);
}
