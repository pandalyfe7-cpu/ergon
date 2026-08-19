import Link from "next/link";
import { notFound } from "next/navigation";

import { Figures, type RegionStyles } from "@/components/body/figures";
import { TOUCH_STYLE } from "@/components/body/palette";
import { SplitRing } from "@/components/history/split-ring";
import { ConstraintBadges, SectionLabel, WarmupIcon } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { getSessionDetail, type ExerciseBlock } from "@/lib/history/data";
import { formatElapsed } from "@/lib/time";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/types";

function touchedStyles(touched: Set<MuscleGroup>): RegionStyles {
  const styles = {} as RegionStyles;
  for (const muscle of MUSCLE_GROUPS) {
    styles[muscle] = touched.has(muscle) ? TOUCH_STYLE.touched : TOUCH_STYLE.untouched;
  }
  return styles;
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getSessionDetail(id);
  if (!detail) notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{detail.dateLabel}</h1>
          <p className="text-fg-dim num text-xs">
            {formatElapsed(detail.durationMs)}
            {" \u00b7 "}
            {formatNumber(Math.round(detail.volume))} lb
          </p>
        </div>
        <Link href="/history" className="text-fg-dim hover:text-fg text-xs underline">
          History
        </Link>
      </header>

      {detail.split.length === 0 ? (
        <p className="text-fg-dim text-sm">No working sets in this session.</p>
      ) : (
        <>
          <section>
            <SectionLabel>Muscle split</SectionLabel>
            <div className="mt-3">
              <SplitRing split={detail.split} />
            </div>
          </section>

          <section className="mt-6">
            <SectionLabel>Worked</SectionLabel>
            <div className="mt-2">
              <Figures styles={touchedStyles(detail.touched)} />
            </div>
          </section>
        </>
      )}

      <section className="mt-6">
        <SectionLabel>Sets</SectionLabel>
        {detail.blocks.length === 0 ? (
          <p className="text-fg-dim mt-2 text-sm">No sets logged.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {detail.blocks.map((block) => (
              <ExerciseCard key={block.exercise.id} block={block} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function ExerciseCard({ block }: { block: ExerciseBlock }) {
  let working = 0;

  return (
    <li className="border-border bg-surface rounded-lg border p-3">
      <p className="truncate text-sm font-medium">{block.exercise.name}</p>

      {block.exercise.constraints.length > 0 ? (
        <div className="mt-1.5">
          <ConstraintBadges constraints={block.exercise.constraints} />
        </div>
      ) : null}

      <ul className="mt-2 space-y-1">
        {block.sets.map((set) => {
          const number = set.is_warmup ? null : ++working;
          const isRecord =
            !set.is_warmup && block.best !== null && set.weight_lb * set.reps >= block.best;

          return (
            <li
              key={set.id}
              className="grid grid-cols-[1.5rem_1fr_2.5rem] items-center gap-2"
            >
              {number === null ? (
                <WarmupIcon />
              ) : (
                <span className="num text-fg-dim text-center text-xs">{number}</span>
              )}

              <span className="num text-sm">
                {formatNumber(set.weight_lb)}
                {"\u00d7"}
                {set.reps}
                {isRecord ? (
                  <span className="border-accent text-accent ml-2 rounded border px-1 py-px text-[9px] tracking-wider">
                    PR
                  </span>
                ) : null}
              </span>

              <span className="num text-fg-dim text-right text-[11px]">
                {set.rpe === null ? "" : `@${formatNumber(set.rpe)}`}
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
