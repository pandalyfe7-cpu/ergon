"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { applyPlanToUser } from "@/lib/onboarding/apply-plan";
import { scoreIntakeDimensions } from "@/lib/onboarding/intake";
import { generatePlan } from "@/lib/onboarding/plan";
import { patchUserProfile } from "@/lib/onboarding/profile-write";
import { requireUser } from "@/lib/data";
import { ensureSeeded } from "@/lib/ergos/seed";
import { getTimeZone } from "@/lib/data";
import { dayWindow } from "@/lib/time";
import type { BarrierCode, MotivatorCode } from "@/lib/types";
import { randomUUID } from "node:crypto";

export type GoalInput = { outcome: string; rank: number };

export type IntakeInput = {
  barriers: Array<{ code: BarrierCode; score: number }>;
  motivators: Array<{ code: MotivatorCode; score: number }>;
};

export async function saveGoals(
  goals: GoalInput[],
): Promise<{ error: string } | { ok: true }> {
  const trimmed = goals
    .map((goal) => ({ ...goal, outcome: goal.outcome.trim() }))
    .filter((goal) => goal.outcome.length > 0);

  if (trimmed.length === 0) return { error: "Add at least one goal." };
  if (trimmed.length > 3) return { error: "At most three goals." };

  const { supabase } = await requireUser();
  await ensureSeeded(supabase);

  await supabase.from("user_goals").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  for (const goal of trimmed) {
    const { error } = await supabase.from("user_goals").insert({
      rank: goal.rank,
      outcome: goal.outcome,
    });
    if (error) return { error: error.message };
  }

  const profileResult = await patchUserProfile(supabase, {
    onboarding_step: 1,
    updated_at: new Date().toISOString(),
  });
  if (profileResult.error) return { error: profileResult.error };

  revalidatePath("/onboarding");
  return { ok: true };
}

export async function saveIntake(
  input: IntakeInput,
): Promise<{ error: string } | { ok: true }> {
  if (input.barriers.length === 0) return { error: "Select at least one barrier." };

  const { supabase } = await requireUser();
  const zone = await getTimeZone();
  const { start } = dayWindow(zone);
  const today = start.toISOString().slice(0, 10);

  const dimensions = [
    ...input.barriers.map((row) => ({
      dimensionKind: "barrier" as const,
      code: row.code,
      currentScore: row.score,
    })),
    ...input.motivators.map((row) => ({
      dimensionKind: "motivator" as const,
      code: row.code,
      currentScore: row.score,
    })),
  ];

  const rowIds = dimensions.map(() => randomUUID());
  const scored = scoreIntakeDimensions(
    dimensions.map((row) => ({
      dimensionKind: row.dimensionKind,
      code: row.code,
      currentScore: row.currentScore,
    })),
    rowIds,
  );

  await supabase.from("user_barriers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("user_motivators").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("intake_scores").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  for (const barrier of input.barriers) {
    const { error } = await supabase.from("user_barriers").insert({ code: barrier.code });
    if (error) return { error: error.message };
  }
  for (const motivator of input.motivators) {
    const { error } = await supabase.from("user_motivators").insert({ code: motivator.code });
    if (error) return { error: error.message };
  }

  for (let index = 0; index < scored.length; index++) {
    const row = scored[index]!;
    const { error } = await supabase.from("intake_scores").insert({
      id: rowIds[index]!,
      dimension_kind: row.dimensionKind,
      dimension_code: row.code,
      score: row.score,
      rule_id: row.rule_id,
      rule_version: row.rule_version,
      trace: row.trace,
    });
    if (error) return { error: error.message };
  }

  const { data: goals } = await supabase.from("user_goals").select("rank, outcome").order("rank");
  const { data: constraints } = await supabase
    .from("user_constraints")
    .select("id, label, blocks_patterns, active");

  const intakeScores: Record<string, number> = {};
  for (const row of scored) intakeScores[row.code] = row.score;

  const plan = generatePlan({
    goals: goals ?? [],
    intakeScores,
    constraints: constraints ?? [],
  });

  await applyPlanToUser(supabase, plan, today);

  revalidatePath("/onboarding");
  return { ok: true };
}

export async function completeOnboarding(): Promise<void> {
  const { supabase } = await requireUser();

  const { data: profile } = await supabase
    .from("user_profile")
    .select("onboarding_step, capacity")
    .maybeSingle();

  const plan = (profile?.capacity as { plan?: unknown } | null)?.plan;
  if (!plan) throw new Error("Generate your plan before continuing.");

  const profileResult = await patchUserProfile(supabase, {
    onboarding_step: 4,
    onboarding_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (profileResult.error) throw new Error(profileResult.error);

  revalidatePath("/today");
  redirect("/today");
}
