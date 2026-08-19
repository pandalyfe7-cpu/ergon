import type { Exercise, LoggedSet, Timestamp } from "@/lib/types";

/** The single best set an exercise has ever produced. */
export type PersonalRecord = {
  exercise: Exercise;
  weight_lb: number;
  reps: number;
  /** weight_lb times reps for that set. This is what the list is ranked by. */
  best: number;
  performed_at: Timestamp;
};

/** Only the columns a record needs, so callers can select narrowly. */
type RecordSet = Pick<
  LoggedSet,
  "exercise_id" | "weight_lb" | "reps" | "is_warmup" | "performed_at"
>;

/**
 * The best weight_lb times reps per exercise, one entry each, heaviest first.
 *
 * "Best" is the largest single-set product, so 225 for 5 beats 135 for 8. Ties
 * go to the heavier weight, then to the earlier set, so a record keeps the date
 * it was actually first set rather than moving on every repeat.
 *
 * Warm-ups never count. Sets for exercises missing from `exercisesById` are
 * skipped rather than guessed at. Nothing here is stored; pass whatever history
 * you want ranked.
 */
export function personalRecords(
  sets: RecordSet[],
  exercisesById: Map<string, Exercise>,
): PersonalRecord[] {
  const bestByExercise = new Map<string, PersonalRecord>();

  for (const set of sets) {
    if (set.is_warmup) continue;

    const exercise = exercisesById.get(set.exercise_id);
    if (!exercise) continue;

    const best = set.weight_lb * set.reps;
    const current = bestByExercise.get(set.exercise_id);

    const better =
      !current ||
      best > current.best ||
      (best === current.best && set.weight_lb > current.weight_lb) ||
      (best === current.best &&
        set.weight_lb === current.weight_lb &&
        set.performed_at < current.performed_at);

    if (!better) continue;

    bestByExercise.set(set.exercise_id, {
      exercise,
      weight_lb: set.weight_lb,
      reps: set.reps,
      best,
      performed_at: set.performed_at,
    });
  }

  return [...bestByExercise.values()].sort(
    (a, b) => b.best - a.best || a.exercise.name.localeCompare(b.exercise.name),
  );
}
