import type { PlanDraft } from "@/lib/onboarding/plan";
import { patchUserProfile } from "@/lib/onboarding/profile-write";
import type { createClient } from "@/lib/supabase/server";
import type { HabitState } from "@/lib/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function applyPlanToUser(
  supabase: Client,
  plan: PlanDraft,
  today: string,
): Promise<void> {
  for (const item of plan.habits) {
    const { data: habit } = await supabase
      .from("habits")
      .select("id, state")
      .eq("slug", item.slug)
      .maybeSingle();
    if (!habit) continue;

    const nextState = item.state as HabitState;
    if (habit.state !== nextState) {
      const { error: updateError } = await supabase
        .from("habits")
        .update({ state: nextState, state_changed_at: new Date().toISOString() })
        .eq("id", habit.id);
      if (updateError) throw new Error(updateError.message);

      const { error: eventError } = await supabase.from("habit_events").insert({
        habit_id: habit.id,
        event_type: "state_change",
        event_date: today,
        from_state: habit.state,
        to_state: nextState,
        note: "onboarding plan",
      });
      if (eventError) throw new Error(eventError.message);
    }
  }

  const { data: profile } = await supabase.from("user_profile").select("capacity").maybeSingle();
  const capacity = (profile?.capacity ?? {}) as Record<string, unknown>;

  const profileResult = await patchUserProfile(supabase, {
    capacity: {
      ...capacity,
      plan: {
        habits: plan.habits,
        metrics: plan.metrics,
        training: plan.training,
        trace: plan.trace,
        rule_id: plan.rule_id,
        rule_version: plan.rule_version,
      },
    },
    onboarding_step: 3,
    updated_at: new Date().toISOString(),
  });
  if (profileResult.error) throw new Error(profileResult.error);
}
