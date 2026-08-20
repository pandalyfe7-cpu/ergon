import Link from "next/link";

import { RecCard } from "@/components/rec-card";
import { MorningEntryCard } from "@/components/today/morning-entry-card";
import { SessionPanel, type LiftRow } from "@/components/today/session-panel";
import { Card, SectionLabel } from "@/components/ui";
import { gateExercises } from "@/lib/engine/gate";
import { prescribeNext } from "@/lib/engine/prescription";
import { getErgosContext } from "@/lib/ergos/data";
import { refreshRecommendations } from "@/lib/ergos/recommendations";
import { formatWeekday } from "@/lib/time";
import type { Exercise, LoggedSet, TemplateExercise } from "@/lib/types";

export default async function TodayPage() {
  const ctx = await getErgosContext();
  const { rows, output, loaded } = await refreshRecommendations(ctx);

  const position = loaded.state.rotation.position;
  const rotationSession = loaded.state.rotation.sessions.find(
    (s) => s.rotationIndex === position,
  );
  const template = loaded.templatesByRotation.get(position);

  // Build the lift list: rotation exercises through the constraint gate (the
  // gate is what decides what may be prescribed), joined to prescriptions and
  // deterministic aims from each movement's last logged session.
  const lifts: LiftRow[] = [];
  let openSets: LoggedSet[] = [];
  let openMatchesRotation = false;

  if (rotationSession && template) {
    const bySlug = new Map<string, Exercise>();
    for (const exercise of loaded.exercisesById.values()) {
      if (exercise.slug) bySlug.set(exercise.slug, exercise);
    }
    const prescriptionById = new Map<string, TemplateExercise>(
      template.exercises.map((row) => [row.exercise_id, row]),
    );

    const gated = gateExercises(
      rotationSession.exercises,
      loaded.state.constraints,
      loaded.state.library,
    );

    const finalIds: string[] = [];
    const pending: {
      exercise: Exercise;
      substitutedFor: string | null;
      prescription: { sets: number; rep_min: number; rep_max: number };
    }[] = [];

    for (const entry of gated.allowed) {
      const exercise = bySlug.get(entry.exercise.slug);
      if (!exercise) continue;
      const originalSlug = entry.substituted_for ?? entry.exercise.slug;
      const original = bySlug.get(originalSlug);
      const prescription = original ? prescriptionById.get(original.id) : undefined;
      pending.push({
        exercise,
        substitutedFor: entry.substituted_for,
        prescription: {
          sets: prescription?.prescribed_sets ?? 3,
          rep_min: prescription?.rep_min ?? 8,
          rep_max: prescription?.rep_max ?? 12,
        },
      });
      finalIds.push(exercise.id);
    }

    // Last session's sets per exercise, for the aim.
    const lastSetsByExercise = new Map<string, LoggedSet[]>();
    if (finalIds.length > 0) {
      const query = ctx.supabase
        .from("logged_sets")
        .select("*")
        .in("exercise_id", finalIds)
        .order("performed_at", { ascending: false })
        .limit(300);
      const { data: history } = loaded.openSession
        ? await query.neq("session_id", loaded.openSession.id)
        : await query;
      for (const id of finalIds) {
        const rows = (history ?? []).filter((s) => s.exercise_id === id);
        if (rows.length === 0) continue;
        const lastSession = rows[0].session_id;
        lastSetsByExercise.set(
          id,
          rows.filter((s) => s.session_id === lastSession),
        );
      }
    }

    for (const item of pending) {
      const aim = prescribeNext(
        item.exercise,
        lastSetsByExercise.get(item.exercise.id) ?? [],
        { rep_min: item.prescription.rep_min, rep_max: item.prescription.rep_max },
      );
      lifts.push({
        exerciseId: item.exercise.id,
        name: item.exercise.name,
        substitutedFor: item.substitutedFor,
        prescription: item.prescription,
        aim: aim
          ? {
              weight_lb: aim.weight_lb,
              rep_min: aim.rep_min,
              rep_max: aim.rep_max,
              rule: aim.rule,
              reason: aim.reason,
            }
          : null,
      });
    }

    if (loaded.openSession) {
      openMatchesRotation = loaded.openSession.template_id === template.id;
      const { data } = await ctx.supabase
        .from("logged_sets")
        .select("*")
        .eq("session_id", loaded.openSession.id)
        .order("performed_at");
      openSets = data ?? [];
    }
  }

  const primary = rows[0] ?? null;
  const secondaryCount = rows.length - 1;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-12">
      <header className="mb-5">
        <h1 className="text-text-hi text-xl font-semibold">Today</h1>
        <p className="text-text-mid mt-0.5 text-sm">
          {formatWeekday(ctx.timeZone)} ·{" "}
          <span className="num">{loaded.state.timeAvailableMin} min available</span>
        </p>
      </header>

      <div className="space-y-4">
        <div className="enter-rise" style={{ "--stagger-i": 0 } as React.CSSProperties}>
          <MorningEntryCard
            entry={loaded.morningEntry}
            defaultTimeAvailable={loaded.settings.default_time_available_min}
          />
        </div>

        {output.coldStart && (
          <Card className="enter-rise">
            <SectionLabel>Cold start</SectionLabel>
            <p className="text-text-mid mt-2 text-sm">
              Under two weeks of history: recommendations are limited to the next
              rotation session and the most overdue habit until there is enough
              data to score honestly.
            </p>
            <ul className="mt-2 space-y-1">
              {output.waitingOn.map((line) => (
                <li key={line} className="text-text-low text-xs">
                  · {line}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <section
          className="enter-rise"
          style={{ "--stagger-i": 1 } as React.CSSProperties}
          aria-label="Primary recommendation"
        >
          <div className="mb-2 flex items-baseline justify-between">
            <SectionLabel>Now</SectionLabel>
            {secondaryCount > 0 && (
              <Link href="/guidance" className="text-accent text-sm hover:underline">
                {secondaryCount} more on Guidance
              </Link>
            )}
          </div>
          {primary ? (
            <RecCard rec={primary} primary />
          ) : (
            <Card>
              <p className="text-text-hi text-sm font-medium">Nothing pressing.</p>
              <p className="text-text-mid mt-1 text-sm">
                No action scores above the threshold right now. Log what you do
                and the engine will keep watch.
              </p>
            </Card>
          )}
        </section>

        <div className="enter-rise" style={{ "--stagger-i": 2 } as React.CSSProperties}>
          {rotationSession && template ? (
            <SessionPanel
              dayLabel={`Rotation day ${position + 1} of 6`}
              sessionName={rotationSession.name}
              open={loaded.openSession}
              openMatchesRotation={openMatchesRotation}
              lifts={lifts}
              initialSets={openSets}
            />
          ) : (
            <Card>
              <p className="text-text-mid text-sm">
                No rotation sessions are seeded. Run{" "}
                <span className="num">npm run db:seed</span> and reload.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
