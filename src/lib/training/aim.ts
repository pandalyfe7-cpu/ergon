import { formatNumber } from "@/lib/format";
import { averageRpe, workingSets } from "@/lib/training/sets";
import {
  getLoadCeilingLb,
  type Exercise,
  type LoggedSet,
  type ProgressionRule,
} from "@/lib/types";

/**
 * Used when a session has no prescribed range for the exercise, which is every
 * freestyle session. A routine's own rep_min/rep_max wins when present.
 */
export const DEFAULT_REP_RANGE = { rep_min: 8, rep_max: 12 } as const;

/** One step of load. Double progression adds this once the range is topped out. */
export const LOAD_STEP_LB = 5;

/** At or above this average RPE, the next session backs off instead of adding. */
export const REST_RPE = 9.5;

/** At or under this average RPE, reps go up at the same weight. */
export const ADD_REPS_RPE = 7;

/** At or under this average RPE, a topped-out range earns the load step. */
export const ADD_LOAD_RPE = 8;

export type RepRange = { rep_min: number; rep_max: number };

/**
 * The target for the next set, and why. Callers that only need numbers read
 * weight_lb / rep_min / rep_max exactly as before; the coach tab reads the rest.
 */
export type Aim = RepRange & {
  weight_lb: number;
  /** Heaviest working weight from the last session, before progression. */
  current_weight_lb: number;
  rule: ProgressionRule;
  /** Under 12 words, by rule. Shown verbatim on the coach card. */
  reason: string;
  /** Last session was maximal. Repeat it rather than pushing. */
  rest: boolean;
  /** Mean RPE of the last session's working sets. Null when unrecorded. */
  avg_rpe: number | null;
};

const REASON: Record<ProgressionRule, string> = {
  hold_no_rpe: "No RPE last session. Holding weight and reps.",
  hold_rest: "Last session near maximal. Hold everything and rest.",
  add_load: "Topped the rep range easily. Add five pounds.",
  add_reps: "Last session felt easy. Same weight, more reps.",
  hold_ceiling: "At this exercise's load ceiling. Holding weight.",
  hold: "Last session was near target. Repeat it.",
  // Applied by prescribeNext in src/lib/engine/prescription.ts, never here.
  load_cap: "Increase capped at 10% over last working weight.",
};

/**
 * The target for the next set. The only place aim numbers are produced.
 *
 * Double progression over the exercise's last session, warm-ups excluded. The
 * rep range never moves; the weight is what progresses, and the rule says what
 * to do with reps inside the range:
 *
 *   no RPE recorded            hold weight and reps
 *   avg RPE >= 9.5             hold weight and reps, flag rest
 *   avg RPE <= 8, range topped +5 lb at the same reps
 *   avg RPE <= 7               same weight, push reps up in the range
 *   otherwise                  hold
 *
 * "Range topped" means every working set reached rep_max, the standard double
 * progression trigger. Every result is clamped to the exercise's LOAD_CEILING,
 * and an increase the ceiling swallows is reported as hold_ceiling so the
 * decision log does not claim a load step that never happened.
 */
export function getAimFor(
  exercise: Exercise,
  lastSets: LoggedSet[],
  repRange: RepRange = DEFAULT_REP_RANGE,
): Aim | null {
  const working = workingSets(lastSets);
  if (working.length === 0) return null;

  const current_weight_lb = working.reduce((best, set) =>
    set.weight_lb > best.weight_lb ? set : best,
  ).weight_lb;

  const avg_rpe = averageRpe(working);
  const lowestReps = working.reduce((low, set) => Math.min(low, set.reps), Infinity);
  const rangeTopped = lowestReps >= repRange.rep_max;

  let rule: ProgressionRule;
  let target = current_weight_lb;

  if (avg_rpe === null) {
    rule = "hold_no_rpe";
  } else if (avg_rpe >= REST_RPE) {
    rule = "hold_rest";
  } else if (rangeTopped && avg_rpe <= ADD_LOAD_RPE) {
    rule = "add_load";
    target = current_weight_lb + LOAD_STEP_LB;
  } else if (avg_rpe <= ADD_REPS_RPE) {
    rule = "add_reps";
  } else {
    rule = "hold";
  }

  const ceiling = getLoadCeilingLb(exercise.constraints);
  const weight_lb = ceiling === null ? target : Math.min(target, ceiling);
  if (rule === "add_load" && weight_lb <= current_weight_lb) rule = "hold_ceiling";

  return {
    weight_lb,
    rep_min: repRange.rep_min,
    rep_max: repRange.rep_max,
    current_weight_lb,
    rule,
    reason: REASON[rule],
    rest: rule === "hold_rest",
    avg_rpe,
  };
}

/** Under 8 words, by rule. */
export function formatAimLine(aim: Aim | null): string {
  if (!aim) return "No prior sets";
  return `Aim ${formatNumber(aim.weight_lb)} lb, ${aim.rep_min}-${aim.rep_max} reps`;
}
