"use client";

import { useMemo, useState } from "react";

import { Elapsed } from "@/components/elapsed";
import { Sheet } from "@/components/sheet";
import { Button, ConstraintBadges, Panel } from "@/components/ui";
import { finishSession } from "@/lib/actions";
import type { WorkoutData } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { formatAimLine, getAimFor } from "@/lib/training/aim";
import { totalVolume } from "@/lib/training/sets";
import type { LoggedSet } from "@/lib/types";

import { SetsTable } from "./sets-table";

export function ActiveLogging({
  session,
  exercises,
  library,
  sets,
  previousByExercise,
  prescribedByExercise,
}: WorkoutData) {
  const [allSets, setAllSets] = useState<LoggedSet[]>(sets);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [picking, setPicking] = useState(false);

  const list = useMemo(() => {
    const result = [...exercises];
    for (const id of extraIds) {
      if (result.some((exercise) => exercise.id === id)) continue;
      const found = library.find((exercise) => exercise.id === id);
      if (found) result.push(found);
    }
    return result;
  }, [exercises, extraIds, library]);

  const position = Math.min(index, Math.max(list.length - 1, 0));
  const current = list[position];
  const volume = totalVolume(allSets);

  const prescribed = current ? prescribedByExercise[current.id] : undefined;
  const aim = current
    ? getAimFor(
        current,
        previousByExercise[current.id] ?? [],
        prescribed
          ? { rep_min: prescribed.rep_min, rep_max: prescribed.rep_max }
          : undefined,
      )
    : null;

  function onSaved(saved: LoggedSet) {
    setAllSets((rows) => {
      const at = rows.findIndex((row) => row.id === saved.id);
      if (at === -1) return [...rows, saved];
      const next = [...rows];
      next[at] = saved;
      return next;
    });
  }

  function choose(id: string) {
    setExtraIds((current) => (current.includes(id) ? current : [...current, id]));
    const existing = list.findIndex((exercise) => exercise.id === id);
    setIndex(existing === -1 ? list.length : existing);
    setPicking(false);
  }

  return (
    <div className="flex-1">
      <header className="border-border bg-background sticky top-0 z-10 border-b">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-baseline gap-3">
            <Elapsed since={session.started_at} className="num text-xl" />
            <span className="num text-fg-dim text-xs">{formatNumber(volume)} lb</span>
          </div>
          <form action={finishSession}>
            <Button type="submit" variant="secondary">
              Finish
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pt-4 pb-12">
        {current ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <NavButton
                label="Previous exercise"
                disabled={position === 0}
                onClick={() => setIndex(position - 1)}
              >
                {"\u2039"}
              </NavButton>

              <div className="min-w-0 text-center">
                <h1 className="truncate text-base font-semibold">{current.name}</h1>
                <p className="num text-fg-dim text-[11px]">
                  {position + 1} / {list.length}
                </p>
              </div>

              <NavButton
                label="Next exercise"
                disabled={position >= list.length - 1}
                onClick={() => setIndex(position + 1)}
              >
                {"\u203a"}
              </NavButton>
            </div>

            <div className="mb-3 flex flex-col items-center gap-2">
              <ConstraintBadges constraints={current.constraints} />
              <p className="text-fg-dim text-xs">{formatAimLine(aim)}</p>
            </div>

            <Panel>
              <SetsTable
                key={current.id}
                sessionId={session.id}
                exercise={current}
                sets={allSets.filter((set) => set.exercise_id === current.id)}
                previous={previousByExercise[current.id] ?? []}
                aim={aim}
                onSaved={onSaved}
              />
            </Panel>
          </>
        ) : (
          <Panel>
            <p className="text-fg-dim text-sm">No exercises in this session.</p>
          </Panel>
        )}

        <Button
          variant="quiet"
          className="mt-3 w-full"
          onClick={() => setPicking(true)}
        >
          Add exercise
        </Button>
      </main>

      <Sheet open={picking} onClose={() => setPicking(false)} title="Add exercise">
        {library.length === 0 ? (
          <p className="text-fg-dim text-sm">No exercises in the library.</p>
        ) : (
          <ul className="max-h-80 space-y-1.5 overflow-y-auto">
            {library.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => choose(exercise.id)}
                  className="border-border hover:border-border-strong flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm"
                >
                  <span className="truncate">{exercise.name}</span>
                  <ConstraintBadges constraints={exercise.constraints} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="border-border text-fg-dim hover:text-fg size-8 shrink-0 rounded-md border text-lg leading-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
