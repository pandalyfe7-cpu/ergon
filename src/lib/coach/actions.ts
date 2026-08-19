"use server";

import { getCoachData } from "@/lib/coach/data";
import { requireUser } from "@/lib/data";

/** What I changed the recommendation to before training. */
export type DecisionOverride = {
  weight_lb: number;
  rep_min: number;
  rep_max: number;
};

/**
 * Write one row to the decision log.
 *
 * The recommendation is recomputed server side rather than posted from the
 * card, so the row records what the coach actually decided and a tampered
 * client cannot rewrite history. Only the override is client input.
 */
export async function recordDecision(
  exercise_id: string,
  override: DecisionOverride | null,
): Promise<{ error: string } | void> {
  const { supabase } = await requireUser();

  const { targets } = await getCoachData();
  const target = targets.find((item) => item.exercise.id === exercise_id);
  if (!target) return { error: "No recommendation for this exercise." };

  if (override) {
    const { weight_lb, rep_min, rep_max } = override;
    if (!Number.isFinite(weight_lb) || weight_lb < 0) {
      return { error: "Weight must be zero or more." };
    }
    if (!Number.isFinite(rep_min) || !Number.isFinite(rep_max) || rep_min < 1) {
      return { error: "Reps must be at least one." };
    }
    if (rep_max < rep_min) return { error: "Rep range is backwards." };
  }

  const { aim } = target;
  const { error } = await supabase.from("coach_decisions").insert({
    exercise_id,
    recommended_weight_lb: aim.weight_lb,
    recommended_rep_min: aim.rep_min,
    recommended_rep_max: aim.rep_max,
    reason: aim.reason,
    rule: aim.rule,
    accepted: override === null,
    override_weight_lb: override?.weight_lb ?? null,
    override_rep_min: override ? Math.trunc(override.rep_min) : null,
    override_rep_max: override ? Math.trunc(override.rep_max) : null,
  });

  if (error) return { error: error.message };
}
