import { SignOutButton } from "@/components/sign-out-button";
import {
  ConstraintsCard,
  DefaultsCard,
  RotationCard,
  TargetsCard,
  WeightsCard,
  type ConstraintRow,
  type TargetRow,
} from "@/components/settings/cards";
import { resolveWeights } from "@/lib/engine/weights";
import { getErgosContext } from "@/lib/ergos/data";

export default async function SettingsPage() {
  const ctx = await getErgosContext();

  const [rotationResult, templatesResult, settingsResult, metricsResult, rulesResult, weightsResult, sleepHabitResult] =
    await Promise.all([
      ctx.supabase.from("rotation_state").select("position").maybeSingle(),
      ctx.supabase
        .from("exercise_templates")
        .select("name, rotation_index")
        .not("rotation_index", "is", null)
        .order("rotation_index"),
      ctx.supabase.from("user_settings").select("*").maybeSingle(),
      ctx.supabase.from("metric_definitions").select("*").order("sort_order"),
      ctx.supabase.from("constraint_rules").select("*").order("rule_id"),
      ctx.supabase.from("engine_weights").select("weights").maybeSingle(),
      ctx.supabase.from("habits").select("config").eq("slug", "sleep-timing").maybeSingle(),
    ]);

  const sessionNames = (templatesResult.data ?? []).map((t) => t.name);
  const metrics: TargetRow[] = (metricsResult.data ?? []).map((def) => ({
    slug: def.slug,
    name: def.name,
    unit: def.unit,
    target: def.target,
  }));
  const rules: ConstraintRow[] = (rulesResult.data ?? []).map((rule) => ({
    rule_id: rule.rule_id,
    description: rule.description,
    active: rule.active,
  }));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-12">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-text-hi text-xl font-semibold">Settings</h1>
          <p className="text-text-mid mt-0.5 text-sm">
            Rotation, targets, the constraint table, and engine weights.
          </p>
        </div>
        <SignOutButton />
      </header>

      <div className="space-y-4">
        <div className="enter-rise" style={{ "--stagger-i": 0 } as React.CSSProperties}>
          <RotationCard
            position={rotationResult.data?.position ?? 0}
            sessionNames={sessionNames.length > 0 ? sessionNames : ["Session 1"]}
          />
        </div>
        <div className="enter-rise" style={{ "--stagger-i": 1 } as React.CSSProperties}>
          <DefaultsCard
            defaultTimeAvailable={settingsResult.data?.default_time_available_min ?? 60}
            bedtime={sleepHabitResult.data?.config?.target_bed_time ?? null}
          />
        </div>
        <div className="enter-rise" style={{ "--stagger-i": 2 } as React.CSSProperties}>
          <TargetsCard metrics={metrics} />
        </div>
        <div className="enter-rise" style={{ "--stagger-i": 3 } as React.CSSProperties}>
          <ConstraintsCard rules={rules} />
        </div>
        <div className="enter-rise" style={{ "--stagger-i": 4 } as React.CSSProperties}>
          <WeightsCard weights={resolveWeights(weightsResult.data?.weights ?? null)} />
        </div>
      </div>
    </div>
  );
}
