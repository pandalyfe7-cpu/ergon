/**
 * ERGOS data layer: builds the engine's plain-data state from Supabase and
 * computes habit streaks, metric values, and windows. All reads are scoped by
 * RLS to the signed-in owner.
 */

import { getTimeZone, requireUser } from "@/lib/data";
import { daysBetween } from "@/lib/engine/engine";
import type {
  EngineState,
  HabitEngineState,
  MetricEngineState,
  RotationSessionState,
} from "@/lib/engine/types";
import { resolveWeights } from "@/lib/engine/weights";
import { sumFoodQuantities } from "@/lib/food/macros";
import { dayWindow, localDate, shiftDate } from "@/lib/time";
import type {
  ConstraintRuleRow,
  Exercise,
  ExerciseTemplate,
  Food,
  Habit,
  HabitEvent,
  HabitState,
  LoggedMeal,
  MetricDefinition,
  MorningEntry,
  MovementPattern,
  Session,
  TaggedExercise,
  UserSettings,
} from "@/lib/types";

export type ErgosContext = {
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"];
  userId: string;
  timeZone: string;
  today: string;
};

export async function getErgosContext(): Promise<ErgosContext> {
  const { supabase, user } = await requireUser();
  const timeZone = await getTimeZone();
  return { supabase, userId: user.id, timeZone, today: dayWindow(timeZone).date };
}

/** Session estimate: five movements, three sets each, with setup. */
export const SESSION_EST_MINUTES = 50;

export function toTagged(exercise: Exercise): TaggedExercise | null {
  if (
    !exercise.slug ||
    !exercise.movement_pattern ||
    !exercise.loading_axis ||
    !exercise.required_position ||
    !exercise.joint_range
  ) {
    return null;
  }
  return {
    slug: exercise.slug,
    name: exercise.name,
    movement_pattern: exercise.movement_pattern,
    loading_axis: exercise.loading_axis,
    required_position: exercise.required_position,
    joint_range: exercise.joint_range,
    flags: exercise.flags ?? [],
    substitution_slug: exercise.substitution_slug,
    is_fixture: exercise.is_fixture,
  };
}

// Habits ---------------------------------------------------------------------

export type HabitWithEvents = {
  habit: Habit;
  events: HabitEvent[];
  streak: number;
  lastCompletedDate: string | null;
  markedToday: boolean;
  /** Days until the decay window closes; negative when already past. */
  daysLeft: number;
};

export function habitDerived(
  habit: Habit,
  events: HabitEvent[],
  today: string,
): HabitWithEvents {
  const marks = events
    .filter((e) => e.event_type === "completed" || e.event_type === "floor")
    .map((e) => e.event_date)
    .sort()
    .reverse();
  const markSet = new Set(marks);
  const lastCompletedDate = marks[0] ?? null;
  const markedToday = markSet.has(today);

  let streak = 0;
  let cursor = markedToday ? today : shiftDate(today, -1);
  while (markSet.has(cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }

  const daysSince = lastCompletedDate ? daysBetween(lastCompletedDate, today) : Infinity;
  const daysLeft = habit.decay_window_days - daysSince;

  return { habit, events, streak, lastCompletedDate, markedToday, daysLeft };
}

/**
 * Lazy state transitions, applied on read and logged as events:
 *   build/hold -> recover when the decay window has passed;
 *   any -> dormant after 14 days without an event.
 * Struggle lowers demand; it never raises pressure.
 */
export async function applyHabitDecay(
  ctx: ErgosContext,
  rows: HabitWithEvents[],
): Promise<HabitWithEvents[]> {
  const DORMANT_AFTER_DAYS = 14;
  const out: HabitWithEvents[] = [];
  for (const row of rows) {
    const { habit, lastCompletedDate } = row;
    const daysSince = lastCompletedDate
      ? daysBetween(lastCompletedDate, ctx.today)
      : daysBetween(localDate(ctx.timeZone, new Date(habit.created_at)), ctx.today);

    let nextState: HabitState | null = null;
    if (habit.state !== "dormant" && daysSince >= DORMANT_AFTER_DAYS) {
      nextState = "dormant";
    } else if (
      (habit.state === "build" || habit.state === "hold") &&
      daysSince > habit.decay_window_days
    ) {
      nextState = "recover";
    }

    if (nextState && nextState !== habit.state) {
      await ctx.supabase
        .from("habits")
        .update({ state: nextState, state_changed_at: new Date().toISOString() })
        .eq("id", habit.id);
      await ctx.supabase.from("habit_events").insert({
        habit_id: habit.id,
        event_type: "state_change",
        event_date: ctx.today,
        from_state: habit.state,
        to_state: nextState,
        note: `decay window ${habit.decay_window_days}d passed (${daysSince}d since last mark)`,
      });
      out.push({ ...row, habit: { ...habit, state: nextState } });
    } else {
      out.push(row);
    }
  }
  return out;
}

export async function loadHabits(ctx: ErgosContext): Promise<HabitWithEvents[]> {
  const [habitsResult, eventsResult] = await Promise.all([
    ctx.supabase.from("habits").select("*").order("sort_order"),
    ctx.supabase
      .from("habit_events")
      .select("*")
      .gte("event_date", shiftDate(ctx.today, -90))
      .order("event_date", { ascending: false }),
  ]);
  const habits = habitsResult.data ?? [];
  const events = eventsResult.data ?? [];
  const derived = habits.map((habit) =>
    habitDerived(habit, events.filter((e) => e.habit_id === habit.id), ctx.today),
  );
  return applyHabitDecay(ctx, derived);
}

// Metrics ----------------------------------------------------------------------

export type MetricDaily = { date: string; value: number | null };

export type MetricComputed = {
  definition: MetricDefinition;
  current: number | null;
  /** Previous distinct value, for the count-up start. */
  previous: number | null;
  trend7d: "up" | "down" | "flat" | null;
  /** Daily points for the requested window, oldest first. */
  daily: MetricDaily[];
};

/** Change below this reads as flat, per metric unit. */
const TREND_EPSILON: Record<string, number> = {
  bodyweight: 0.5,
  "sleep-duration": 0.3,
  protein: 8,
  "training-days": 0.5,
  readiness: 0.5,
};

function trendFrom(
  slug: string,
  daily: MetricDaily[],
): "up" | "down" | "flat" | null {
  const values = daily.filter((d) => d.value !== null);
  if (values.length < 2) return null;
  const recent = values.slice(-3);
  const prior = values.slice(0, -3).slice(-4);
  if (prior.length === 0) return null;
  const avg = (rows: MetricDaily[]) =>
    rows.reduce((sum, r) => sum + (r.value ?? 0), 0) / rows.length;
  const delta = avg(recent) - avg(prior);
  const epsilon = TREND_EPSILON[slug] ?? 0.1;
  if (delta > epsilon) return "up";
  if (delta < -epsilon) return "down";
  return "flat";
}

export type MetricSources = {
  bodyweight: { date: string; value: number }[];
  morningEntries: MorningEntry[];
  meals: { date: string; protein: number }[];
  trainedDates: string[];
};

export async function loadMetricSources(
  ctx: ErgosContext,
  windowDays: number,
): Promise<MetricSources> {
  const fromDate = shiftDate(ctx.today, -windowDays - 7);
  const fromIso = new Date(`${fromDate}T00:00:00Z`).toISOString();

  const [bwResult, morningResult, mealsResult, sessionsResult] = await Promise.all([
    ctx.supabase
      .from("bodyweight_logs")
      .select("weight_lb, logged_at")
      .gte("logged_at", fromIso)
      .order("logged_at"),
    ctx.supabase
      .from("morning_entries")
      .select("*")
      .gte("entry_date", fromDate)
      .order("entry_date"),
    ctx.supabase
      .from("logged_meals")
      .select("*")
      .gte("eaten_at", fromIso),
    ctx.supabase
      .from("sessions")
      .select("started_at, ended_at, template_id")
      .not("ended_at", "is", null)
      .gte("started_at", fromIso),
  ]);

  const meals = mealsResult.data ?? [];
  let mealProtein: { date: string; protein: number }[] = [];
  if (meals.length > 0) {
    const foodIds = [...new Set(meals.map((m) => m.food_id))];
    const { data: foods } = await ctx.supabase
      .from("foods")
      .select("*")
      .in("id", foodIds);
    const byId = new Map<string, Food>((foods ?? []).map((f) => [f.id, f]));
    const byDate = new Map<string, { food: Food; quantity: number }[]>();
    for (const meal of meals as LoggedMeal[]) {
      const food = byId.get(meal.food_id);
      if (!food) continue;
      const date = localDate(ctx.timeZone, new Date(meal.eaten_at));
      const list = byDate.get(date) ?? [];
      list.push({ food, quantity: meal.serving });
      byDate.set(date, list);
    }
    mealProtein = [...byDate.entries()].map(([date, rows]) => ({
      date,
      protein: sumFoodQuantities(rows).protein_g,
    }));
  }

  return {
    bodyweight: (bwResult.data ?? []).map((row) => ({
      date: localDate(ctx.timeZone, new Date(row.logged_at)),
      value: Number(row.weight_lb),
    })),
    morningEntries: morningResult.data ?? [],
    meals: mealProtein,
    trainedDates: [
      ...new Set(
        (sessionsResult.data ?? []).map((s) =>
          localDate(ctx.timeZone, new Date(s.started_at)),
        ),
      ),
    ].sort(),
  };
}

function dailySeries(
  slug: string,
  sources: MetricSources,
  today: string,
  windowDays: number,
): MetricDaily[] {
  const dates = Array.from({ length: windowDays }, (_, i) =>
    shiftDate(today, i - windowDays + 1),
  );

  switch (slug) {
    case "bodyweight": {
      const byDate = new Map<string, number>();
      for (const row of sources.bodyweight) byDate.set(row.date, row.value);
      return dates.map((date) => ({ date, value: byDate.get(date) ?? null }));
    }
    case "sleep-duration": {
      const byDate = new Map(
        sources.morningEntries.map((e) => [e.entry_date, Number(e.sleep_hours)]),
      );
      return dates.map((date) => ({ date, value: byDate.get(date) ?? null }));
    }
    case "protein": {
      const byDate = new Map(sources.meals.map((m) => [m.date, m.protein]));
      return dates.map((date) => ({ date, value: byDate.get(date) ?? null }));
    }
    case "training-days": {
      const trained = new Set(sources.trainedDates);
      return dates.map((date) => {
        let count = 0;
        for (let i = 0; i < 7; i++) {
          if (trained.has(shiftDate(date, -i))) count++;
        }
        return { date, value: count };
      });
    }
    case "readiness": {
      const byDate = new Map(
        sources.morningEntries.map((e) => [e.entry_date, e.sleep_quality]),
      );
      return dates.map((date) => ({ date, value: byDate.get(date) ?? null }));
    }
    default:
      return dates.map((date) => ({ date, value: null }));
  }
}

export function computeMetric(
  definition: MetricDefinition,
  sources: MetricSources,
  today: string,
  windowDays: number,
): MetricComputed {
  const daily = dailySeries(definition.slug, sources, today, windowDays);
  const nonNull = daily.filter((d) => d.value !== null);
  const current = nonNull.length > 0 ? nonNull[nonNull.length - 1].value : null;
  const previous = nonNull.length > 1 ? nonNull[nonNull.length - 2].value : null;
  const trendWindow = dailySeries(definition.slug, sources, today, 7);
  return {
    definition,
    current,
    previous,
    trend7d: trendFrom(definition.slug, trendWindow),
    daily,
  };
}

/**
 * Weekly recompute of the derived protein target from the 7-day average
 * bodyweight (never a single day's reading). Stores the derived floor,
 * ceiling, and source weight back so Settings can show why it changed.
 */
export async function ensureDerivedProteinTarget(
  ctx: ErgosContext,
  definition: MetricDefinition,
  bodyweight: { date: string; value: number }[],
): Promise<MetricDefinition> {
  const target = definition.target;
  if (target.type !== "derived_protein") return definition;

  const stale =
    !target.computed_at ||
    daysBetween(localDate(ctx.timeZone, new Date(target.computed_at)), ctx.today) >= 7;
  if (!stale) return definition;

  const weekAgo = shiftDate(ctx.today, -7);
  const recent = bodyweight.filter((row) => row.date > weekAgo);
  if (recent.length === 0) return definition;

  const average = recent.reduce((sum, row) => sum + row.value, 0) / recent.length;
  const floor = Math.round(target.g_per_lb * average);
  const updated = {
    ...target,
    floor,
    ceiling: floor + target.ceiling_offset,
    source_weight_lb: Number(average.toFixed(1)),
    computed_at: new Date().toISOString(),
  };
  await ctx.supabase
    .from("metric_definitions")
    .update({ target: updated })
    .eq("id", definition.id);
  return { ...definition, target: updated };
}

// Engine state -------------------------------------------------------------------

export type LoadedEngineData = {
  state: EngineState;
  templatesByRotation: Map<number, ExerciseTemplate>;
  exercisesById: Map<string, Exercise>;
  morningEntry: MorningEntry | null;
  settings: UserSettings;
  habitsWithEvents: HabitWithEvents[];
  metricsComputed: MetricComputed[];
  openSession: Session | null;
};

export async function loadEngineData(ctx: ErgosContext): Promise<LoadedEngineData> {
  const { supabase, timeZone, today } = ctx;
  const from90 = new Date(`${shiftDate(today, -90)}T00:00:00Z`).toISOString();
  const from3 = new Date(`${shiftDate(today, -3)}T00:00:00Z`).toISOString();

  const [
    rotationResult,
    templatesResult,
    exercisesResult,
    sessionsResult,
    recentSetsResult,
    constraintsResult,
    metricDefsResult,
    weightsResult,
    settingsResult,
    morningResult,
    openSessionResult,
  ] = await Promise.all([
    supabase.from("rotation_state").select("*").maybeSingle(),
    supabase.from("exercise_templates").select("*").not("rotation_index", "is", null),
    supabase.from("exercises").select("*"),
    supabase
      .from("sessions")
      .select("*")
      .not("ended_at", "is", null)
      .gte("started_at", from90)
      .order("started_at", { ascending: false }),
    supabase
      .from("logged_sets")
      .select("exercise_id, performed_at, is_warmup")
      .gte("performed_at", from3),
    supabase.from("constraint_rules").select("*"),
    supabase.from("metric_definitions").select("*").order("sort_order"),
    supabase.from("engine_weights").select("*").maybeSingle(),
    supabase.from("user_settings").select("*").maybeSingle(),
    supabase.from("morning_entries").select("*").eq("entry_date", today).maybeSingle(),
    supabase.from("sessions").select("*").is("ended_at", null).maybeSingle(),
  ]);

  const habitsWithEvents = await loadHabits(ctx);
  const sources = await loadMetricSources(ctx, 90);

  // Settings row is seeded; a missing row here means a brand-new test user.
  let settings = settingsResult.data;
  if (!settings) {
    const created = await supabase.from("user_settings").insert({}).select().single();
    settings = created.data ?? null;
    if (!settings) {
      const retry = await supabase.from("user_settings").select("*").single();
      settings = retry.data;
    }
  }
  if (!settings) throw new Error("Could not load user settings");

  let metricDefs = metricDefsResult.data ?? [];
  metricDefs = await Promise.all(
    metricDefs.map((def) => ensureDerivedProteinTarget(ctx, def, sources.bodyweight)),
  );

  const exercises = exercisesResult.data ?? [];
  const exercisesById = new Map(exercises.map((e) => [e.id, e]));
  const library = new Map<string, TaggedExercise>();
  for (const exercise of exercises) {
    const tagged = toTagged(exercise);
    if (tagged) library.set(tagged.slug, tagged);
  }

  const sessions = sessionsResult.data ?? [];
  const templates = templatesResult.data ?? [];
  const templatesByRotation = new Map(
    templates
      .filter((t) => t.rotation_index !== null)
      .map((t) => [t.rotation_index as number, t]),
  );

  const lastRunByTemplate = new Map<string, string>();
  for (const session of sessions) {
    if (!session.template_id) continue;
    if (!lastRunByTemplate.has(session.template_id)) {
      lastRunByTemplate.set(
        session.template_id,
        localDate(timeZone, new Date(session.started_at)),
      );
    }
  }

  const rotationSessions: RotationSessionState[] = [...templatesByRotation.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rotationIndex, template]) => {
      const sessionExercises = template.exercises
        .map((row) => {
          const exercise = exercisesById.get(row.exercise_id);
          return exercise ? toTagged(exercise) : null;
        })
        .filter((e): e is TaggedExercise => e !== null);
      return {
        rotationIndex,
        templateId: template.id,
        name: template.name,
        patterns: [...new Set(sessionExercises.map((e) => e.movement_pattern))],
        exercises: sessionExercises,
        lastPerformedDate: lastRunByTemplate.get(template.id) ?? null,
        estMinutes: SESSION_EST_MINUTES,
      };
    });

  const trainedDates = [
    ...new Set(sessions.map((s) => localDate(timeZone, new Date(s.started_at)))),
  ].sort((a, b) => (a < b ? 1 : -1));

  const patternsByDate: Record<string, MovementPattern[]> = {};
  for (const set of recentSetsResult.data ?? []) {
    if (set.is_warmup) continue;
    const exercise = exercisesById.get(set.exercise_id);
    const pattern = exercise?.movement_pattern;
    if (!pattern) continue;
    const date = localDate(timeZone, new Date(set.performed_at));
    const list = patternsByDate[date] ?? [];
    if (!list.includes(pattern)) list.push(pattern);
    patternsByDate[date] = list;
  }

  const habits: HabitEngineState[] = habitsWithEvents.map((row) => ({
    slug: row.habit.slug,
    name: row.habit.name,
    state: row.habit.state,
    streak: row.streak,
    lastCompletedDate: row.lastCompletedDate,
    decayWindowDays: row.habit.decay_window_days,
    floorAction: row.habit.floor_action,
    markedToday: row.markedToday,
  }));

  const metricsComputed = metricDefs.map((def) =>
    computeMetric(def, sources, today, 90),
  );
  const metrics: MetricEngineState[] = metricsComputed.map((m) => ({
    slug: m.definition.slug,
    name: m.definition.name,
    unit: m.definition.unit,
    direction: m.definition.direction,
    current: m.current,
    floor: m.definition.target.floor,
    ceiling: m.definition.target.ceiling,
    trend7d: m.trend7d,
  }));

  const firstDates: string[] = [];
  if (sessions.length > 0) {
    firstDates.push(localDate(timeZone, new Date(sessions[sessions.length - 1].started_at)));
  }
  for (const row of habitsWithEvents) {
    const oldest = row.events[row.events.length - 1];
    if (oldest) firstDates.push(oldest.event_date);
  }
  if (sources.morningEntries.length > 0) {
    firstDates.push(sources.morningEntries[0].entry_date);
  }
  if (sources.bodyweight.length > 0) {
    firstDates.push(sources.bodyweight[0].date);
  }
  const historyDays =
    firstDates.length === 0
      ? 0
      : Math.max(...firstDates.map((d) => daysBetween(d, today)));

  const morning = morningResult.data;
  const timeAvailableMin =
    morning?.time_available_min ?? settings.default_time_available_min;

  const bodyweightDates = sources.bodyweight.map((b) => b.date).sort();

  const state: EngineState = {
    today,
    historyDays,
    rotation: { position: rotationResult.data?.position ?? 0, sessions: rotationSessions },
    trainedDates,
    patternsByDate,
    habits,
    metrics,
    morning: morning
      ? { sleepHours: Number(morning.sleep_hours), sleepQuality: morning.sleep_quality }
      : null,
    timeAvailableMin,
    bodyweightLastLoggedDate: bodyweightDates[bodyweightDates.length - 1] ?? null,
    constraints: (constraintsResult.data ?? []) as ConstraintRuleRow[],
    library,
    weights: resolveWeights(weightsResult.data?.weights ?? null),
    seedVersions: {
      exercises: templates[0]?.seed_version ?? "unknown",
      constraints: constraintsResult.data?.[0]?.seed_version ?? "unknown",
    },
  };

  return {
    state,
    templatesByRotation,
    exercisesById,
    morningEntry: morning,
    settings,
    habitsWithEvents,
    metricsComputed,
    openSession: openSessionResult.data,
  };
}
