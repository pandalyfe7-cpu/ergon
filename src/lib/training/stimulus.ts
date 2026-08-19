import { MUSCLE_GROUPS, type Exercise, type LoggedSet, type MuscleGroup } from "@/lib/types";

/** One exercise's share of a muscle's stimulus over the period. */
export type ExerciseContribution = {
  exercise: Exercise;
  /** The exercise's stimulus_weights value for this muscle. */
  weight: number;
  /** The non-warm-up sets that counted, in set_order. */
  sets: LoggedSet[];
  /** weight times the number of those sets. */
  subtotal: number;
};

export type MuscleStimulus = {
  total: number;
  /** Descending by subtotal. Only exercises that actually trained the muscle. */
  byExercise: ExerciseContribution[];
};

export type StimulusTotals = Record<MuscleGroup, MuscleStimulus>;

export type StimulusBand = "none" | "low" | "in_range" | "high";

/** Bands are fixed: 0, under 10, 10 through 20, above 20. */
export function stimulusBand(total: number): StimulusBand {
  if (total <= 0) return "none";
  if (total < 10) return "low";
  if (total <= 20) return "in_range";
  return "high";
}

function emptyTotals(): StimulusTotals {
  const totals = {} as StimulusTotals;
  for (const muscle of MUSCLE_GROUPS) totals[muscle] = { total: 0, byExercise: [] };
  return totals;
}

/**
 * Stimulus per muscle for one period's sets. A set contributes its exercise's
 * stimulus_weights value to each muscle that exercise lists; muscles the
 * exercise omits are untouched rather than counted as zero. Warm-ups are
 * dropped before anything is summed.
 *
 * Scope the sets to the period you want before calling. Pass one Monday-to-
 * Sunday window for a week, or call once per week to build a trend.
 */
export function weeklyStimulus(
  sets: LoggedSet[],
  exercisesById: Map<string, Exercise>,
): StimulusTotals {
  const totals = emptyTotals();

  const setsByExercise = new Map<string, LoggedSet[]>();
  for (const set of sets) {
    if (set.is_warmup) continue;
    const existing = setsByExercise.get(set.exercise_id);
    if (existing) existing.push(set);
    else setsByExercise.set(set.exercise_id, [set]);
  }

  for (const [exerciseId, exerciseSets] of setsByExercise) {
    const exercise = exercisesById.get(exerciseId);
    if (!exercise) continue;

    exerciseSets.sort((a, b) => a.set_order - b.set_order);

    for (const muscle of MUSCLE_GROUPS) {
      const weight = exercise.stimulus_weights[muscle];
      if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) {
        continue;
      }

      const subtotal = weight * exerciseSets.length;
      totals[muscle].total += subtotal;
      totals[muscle].byExercise.push({ exercise, weight, sets: exerciseSets, subtotal });
    }
  }

  for (const muscle of MUSCLE_GROUPS) {
    totals[muscle].byExercise.sort((a, b) => b.subtotal - a.subtotal);
  }

  return totals;
}

export type TrendDirection = "rising" | "flat" | "falling" | "none";

/** Change within this percentage of the prior period reads as flat. */
export const FLAT_BAND_PCT = 10;

export type MuscleTrend = {
  /** Total across the selected timeframe. */
  current: number;
  /** Total across the equally long period before it. */
  prior: number;
  /** Null when the prior period was zero, which ranks first as "new". */
  percentChange: number | null;
  direction: TrendDirection;
  /** One total per week of the timeframe, oldest first. */
  weekly: number[];
};

export type TrendTotals = Record<MuscleGroup, MuscleTrend>;

function directionOf(current: number, prior: number): TrendDirection {
  if (current <= 0 && prior <= 0) return "none";
  if (prior <= 0) return "rising";
  const change = ((current - prior) / prior) * 100;
  if (Math.abs(change) <= FLAT_BAND_PCT) return "flat";
  return change > 0 ? "rising" : "falling";
}

/**
 * Direction per muscle for a timeframe against the equally long period before
 * it. Both arguments are already-computed weekly totals, oldest week first, so
 * nothing is summed twice.
 */
export function muscleTrends(
  currentWeeks: StimulusTotals[],
  priorWeeks: StimulusTotals[],
): TrendTotals {
  const sum = (weeks: StimulusTotals[], muscle: MuscleGroup) =>
    weeks.reduce((running, week) => running + week[muscle].total, 0);

  const trends = {} as TrendTotals;

  for (const muscle of MUSCLE_GROUPS) {
    const current = sum(currentWeeks, muscle);
    const prior = sum(priorWeeks, muscle);

    trends[muscle] = {
      current,
      prior,
      percentChange: prior > 0 ? ((current - prior) / prior) * 100 : null,
      direction: directionOf(current, prior),
      weekly: currentWeeks.map((week) => week[muscle].total),
    };
  }

  return trends;
}

/** Ranks "new" muscles above every measurable rise, then by percent change. */
export function compareTrend(a: MuscleTrend, b: MuscleTrend): number {
  const rank = (trend: MuscleTrend) =>
    trend.percentChange === null ? (trend.current > 0 ? Infinity : -Infinity) : trend.percentChange;
  return rank(b) - rank(a);
}
