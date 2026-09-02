import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/app/onboarding/onboarding-flow";
import { SignOutButton } from "@/components/sign-out-button";
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
  if (state.complete) redirect("/today");

  const [{ data: goals }, { data: profile }, { data: habits }, { data: metrics }] =
    await Promise.all([
      supabase.from("user_goals").select("rank, outcome").order("rank"),
      supabase.from("user_profile").select("capacity, onboarding_step").maybeSingle(),
      supabase.from("habits").select("slug, name"),
      supabase.from("metric_definitions").select("slug, name"),
    ]);

  const habitNames = Object.fromEntries((habits ?? []).map((row) => [row.slug, row.name]));
  const metricNames = Object.fromEntries((metrics ?? []).map((row) => [row.slug, row.name]));

  const capacity = profile?.capacity as { plan?: PlanSummary } | null;
  const step = profile?.onboarding_step ?? 0;

  return (
    <main className="bg-bg min-h-dvh px-6 py-10">
      <div className="mx-auto flex max-w-lg justify-end">
        <SignOutButton />
      </div>
      <OnboardingFlow
        step={step}
        goals={goals ?? []}
        plan={capacity?.plan ?? null}
        habitNames={habitNames}
        metricNames={metricNames}
      />
    </main>
  );
}
