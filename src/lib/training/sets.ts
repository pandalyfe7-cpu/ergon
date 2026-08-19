import type { LoggedSet } from "@/lib/types";

/** What the sets table sends to the server. */
export type SaveSetInput = {
  id: string | null;
  session_id: string;
  exercise_id: string;
  weight_lb: number;
  reps: number;
  /** Optional. Null means unrecorded, which holds progression rather than guessing. */
  rpe: number | null;
  is_warmup: boolean;
  set_order: number;
};

export function workingSets<T extends { is_warmup: boolean }>(sets: T[]): T[] {
  return sets.filter((set) => !set.is_warmup);
}

/** Total load in lb. Warm-ups are excluded. */
export function totalVolume(sets: Array<Pick<LoggedSet, "is_warmup" | "weight_lb" | "reps">>) {
  return workingSets(sets).reduce((sum, set) => sum + set.weight_lb * set.reps, 0);
}

/** The set a recommendation is judged against: heaviest, ties broken by reps. */
export function heaviestSet<T extends Pick<LoggedSet, "weight_lb" | "reps">>(
  sets: T[],
): T | null {
  if (sets.length === 0) return null;
  return sets.reduce((best, set) =>
    set.weight_lb > best.weight_lb ||
    (set.weight_lb === best.weight_lb && set.reps > best.reps)
      ? set
      : best,
  );
}

/**
 * Mean RPE across the sets that carry one. Null when none do, which every
 * progression rule reads as "hold" rather than a guess. Partially recorded
 * sessions average only the sets I rated.
 */
export function averageRpe(sets: Array<Pick<LoggedSet, "rpe">>): number | null {
  const rated = sets.filter((set): set is { rpe: number } => set.rpe !== null);
  if (rated.length === 0) return null;
  return rated.reduce((sum, set) => sum + set.rpe, 0) / rated.length;
}
