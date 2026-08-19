import Link from "next/link";

import { TargetCard } from "@/components/coach/target-card";
import { SectionLabel } from "@/components/ui";
import { getCoachData, VOLUME_FLOOR } from "@/lib/coach/data";
import { formatMuscleGroup, formatNumber } from "@/lib/format";

export default async function CoachPage() {
  const { targets, flags, weekLabel, hasHistory } = await getCoachData();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Coach</h1>
        <Link href="/" className="text-fg-dim hover:text-fg text-xs underline">
          Today
        </Link>
      </header>

      {hasHistory ? null : (
        <p className="text-fg-dim text-sm">
          No finished sessions yet. Log a workout and targets appear here.
        </p>
      )}

      {targets.length > 0 ? (
        <section>
          <SectionLabel>Review targets</SectionLabel>
          <ul className="mt-2 space-y-2">
            {targets.map((target) => (
              <TargetCard key={target.exercise.id} target={target} />
            ))}
          </ul>
        </section>
      ) : null}

      {hasHistory ? (
        <section className="mt-6">
          <SectionLabel>Volume flags</SectionLabel>
          <p className="text-fg-dim num mt-1 text-[11px]">{weekLabel}</p>

          {flags.length === 0 ? (
            <p className="text-fg-dim mt-2 text-sm">Every muscle is at ten or more.</p>
          ) : (
            <ul className="divide-border border-border mt-2 divide-y border-t border-b">
              {flags.map((flag) => (
                <li
                  key={flag.muscle}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-sm">{formatMuscleGroup(flag.muscle)}</span>
                  <span className="num text-fg-dim text-sm">
                    {formatNumber(flag.total)} / {VOLUME_FLOOR}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}
