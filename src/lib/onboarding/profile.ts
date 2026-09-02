import { ONBOARDING_COMPLETE_STEP } from "@/lib/onboarding/constants";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type OnboardingState = {
  step: number;
  complete: boolean;
  profileExists: boolean;
};

export async function getOnboardingState(supabase: Client): Promise<OnboardingState> {
  const { data: profile } = await supabase
    .from("user_profile")
    .select("onboarding_step")
    .maybeSingle();

  if (!profile) {
    return { step: 0, complete: false, profileExists: false };
  }

  return {
    step: profile.onboarding_step,
    complete: profile.onboarding_step >= ONBOARDING_COMPLETE_STEP,
    profileExists: true,
  };
}

export function isOnboardingComplete(step: number | null | undefined): boolean {
  return typeof step === "number" && step >= ONBOARDING_COMPLETE_STEP;
}
