import type { createClient } from "@/lib/supabase/server";
import { heaviestSet, workingSets } from "@/lib/training/sets";
import type { UUID } from "@/lib/types";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Attach the outcome of a session to the recommendation it answers.
 *
 * The newest decision for an exercise is the live one. It is claimed by the
 * first session to log a working set for that exercise, and then kept up to
 * date as that session goes on, so performed_* always describes the heaviest
 * working set actually lifted against the recommendation. A decision already
 * claimed by an earlier session is left alone.
 *
 * Failures are swallowed: nothing reads this table, so a write that misses must
 * never take a logged set down with it.
 */
export async function linkDecisionToSession(
  supabase: Client,
  exercise_id: UUID,
  session_id: UUID,
): Promise<void> {
  const { data: decision } = await supabase
    .from("coach_decisions")
    .select("id, session_id")
    .eq("exercise_id", exercise_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!decision) return;
  if (decision.session_id && decision.session_id !== session_id) return;

  const { data: sets } = await supabase
    .from("logged_sets")
    .select("weight_lb, reps, is_warmup")
    .eq("session_id", session_id)
    .eq("exercise_id", exercise_id);

  const working = workingSets(sets ?? []);
  const top = heaviestSet(working);
  if (!top) return;

  await supabase
    .from("coach_decisions")
    .update({
      session_id,
      performed_weight_lb: top.weight_lb,
      performed_reps: top.reps,
      performed_sets: working.length,
      performed_at: new Date().toISOString(),
    })
    .eq("id", decision.id);
}
