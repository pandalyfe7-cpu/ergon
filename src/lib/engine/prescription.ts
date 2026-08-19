/**
 * Load prescription with the coaching guardrail applied: never suggest a load
 * increase above 10% over the last logged working weight, and never increase
 * load and reps in the same session (getAimFor's rules are mutually
 * exclusive by construction; the cap is enforced here).
 */

import { getAimFor, type Aim, type RepRange } from "@/lib/training/aim";
import type { Exercise, LoggedSet } from "@/lib/types";

export const LOAD_CAP_FRACTION = 0.1;

/** Plates come in 2.5 lb steps; a cap that lands between steps rounds down. */
function floorToStep(weight: number, step = 2.5): number {
  return Math.floor(weight / step) * step;
}

export function prescribeNext(
  exercise: Exercise,
  lastSets: LoggedSet[],
  repRange?: RepRange,
): Aim | null {
  const aim = getAimFor(exercise, lastSets, repRange);
  if (!aim) return null;

  const cap = floorToStep(aim.current_weight_lb * (1 + LOAD_CAP_FRACTION));
  if (aim.weight_lb <= cap) return aim;

  const capped = Math.max(cap, aim.current_weight_lb);
  return {
    ...aim,
    weight_lb: capped,
    rule: "load_cap",
    reason:
      capped === aim.current_weight_lb
        ? "Progression capped at 10% over last working weight. Holding."
        : "Increase capped at 10% over last working weight.",
  };
}
