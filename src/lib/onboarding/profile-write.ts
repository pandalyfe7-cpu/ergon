import type { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types";

type Client = Awaited<ReturnType<typeof createClient>>;
type ProfilePatch = Partial<
  Pick<
    UserProfile,
    | "capacity"
    | "onboarding_step"
    | "onboarding_completed_at"
    | "updated_at"
    | "age_band"
    | "height_cm"
    | "weight_kg"
    | "training_years"
    | "baseline_weekly_days"
  >
>;

export async function patchUserProfile(
  supabase: Client,
  patch: ProfilePatch,
): Promise<{ error: string | null }> {
  const { data: existing } = await supabase.from("user_profile").select("user_id").maybeSingle();

  if (existing) {
    const { error } = await supabase.from("user_profile").update(patch).eq("user_id", existing.user_id);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from("user_profile").insert({
    age_band: null,
    height_cm: null,
    weight_kg: null,
    training_years: null,
    baseline_weekly_days: null,
    capacity: {},
    onboarding_step: 0,
    onboarding_completed_at: null,
    ...patch,
  });
  return { error: error?.message ?? null };
}
