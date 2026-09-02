import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/app/onboarding/onboarding-flow";
import { requireUser } from "@/lib/data";
import { ensureSeeded } from "@/lib/ergos/seed";
import { getOnboardingState } from "@/lib/onboarding/profile";

type PlanSummary = {
  habits: Array<{ slug: string; state: string; frequencyPerWeek: number }>;
  metrics: Array<{ slug: string }>;
  training: { templateKey: string } | null;
};

export default async function OnboardingPage() {
  const { supabase } = await requireUser();
  await ensureSeeded(supabase);

  const state = await getOnboardingState(supabase);
  if (state.complete) redirect("/");

  const [{ data: goals }, { data: profile }] = await Promise.all([
    supabase.from("user_goals").select("rank, outcome").order("rank"),
    supabase.from("user_profile").select("capacity, onboarding_step").maybeSingle(),
  ]);

  const capacity = profile?.capacity as { plan?: PlanSummary } | null;
  const step = profile?.onboarding_step ?? 0;

  return (
    <main className="bg-bg min-h-dvh px-6 py-10">
      <OnboardingFlow
        step={step}
        goals={goals ?? []}
        plan={capacity?.plan ?? null}
      />
    </main>
  );
}
