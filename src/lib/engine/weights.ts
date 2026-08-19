/**
 * Scoring weights. This file is the single source of defaults; the owner
 * edits overrides in Settings (stored in engine_weights.weights) and the
 * engine never adjusts them on its own.
 */

export type WeightsConfig = {
  /** Days since a rotation session / movement pattern last trained. */
  staleness: number;
  /** Distance of a metric from its target band. */
  gap: number;
  /** A habit about to break its streak (approaching its decay window). */
  decay_risk: number;
  /** Bonus when an action fits comfortably in the time available. */
  fit: number;
  /** Boost for recovery actions when sleep was short or poor. */
  recovery: number;
  /** Boost for rest after three consecutive training days. */
  rest_pressure: number;
  /** Minimum score a recommendation needs to surface at all. */
  threshold: number;
};

export const DEFAULT_WEIGHTS: WeightsConfig = {
  staleness: 1.0,
  gap: 1.0,
  decay_risk: 1.3,
  fit: 0.3,
  recovery: 2.0,
  rest_pressure: 1.5,
  threshold: 0.5,
};

export const WEIGHT_DESCRIPTIONS: Record<keyof WeightsConfig, string> = {
  staleness: "Days since the next session's patterns trained",
  gap: "Distance of a metric from its target band",
  decay_risk: "Habit approaching its decay window",
  fit: "Action fits the time available today",
  recovery: "Recovery priority after short or poor sleep",
  rest_pressure: "Rest priority after three consecutive training days",
  threshold: "Minimum score to surface a recommendation",
};

/** Settings writes are merged over defaults so a new weight never breaks. */
export function resolveWeights(stored: Record<string, number> | null): WeightsConfig {
  if (!stored) return DEFAULT_WEIGHTS;
  const merged = { ...DEFAULT_WEIGHTS };
  for (const key of Object.keys(DEFAULT_WEIGHTS) as (keyof WeightsConfig)[]) {
    const value = stored[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      merged[key] = value;
    }
  }
  return merged;
}
