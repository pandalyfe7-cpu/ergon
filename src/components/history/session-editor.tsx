"use client";

/**
 * Editable sets for a finished session. Each field saves on change with
 * optimistic UI; a failed write rolls the row back and offers retry. Rows can
 * be deleted and new sets added per exercise.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useToast } from "@/components/toast";
import { Button, cx, NumberField, WarmupIcon } from "@/components/ui";
import { saveSet } from "@/lib/actions";
import { call } from "@/lib/client/call";
import { deleteLoggedSet } from "@/lib/ergos/actions";
import { formatNumber } from "@/lib/format";
import type { LoggedSet } from "@/lib/types";

type Block = {
  exerciseId: string;
  exerciseName: string;
  sets: LoggedSet[];
  best: number | null;
};

export function SessionEditor({
  sessionId,
  blocks: initialBlocks,
}: {
  sessionId: string;
  blocks: Block[];
}) {
  const router = useRouter();
  const { fail, toast } = useToast();
  const [, startTransition] = useTransition();
  const [blocks, setBlocks] = useState(initialBlocks);

  function replaceSet(exerciseId: string, setId: string, next: LoggedSet | null) {
    setBlocks((current) =>
      current.map((block) => {
        if (block.exerciseId !== exerciseId) return block;
        const sets =
          next === null
            ? block.sets.filter((s) => s.id !== setId)
            : block.sets.map((s) => (s.id === setId ? next : s));
        return { ...block, sets };
      }),
    );
  }

  function update(block: Block, set: LoggedSet, patch: Partial<LoggedSet>) {
    const optimistic = { ...set, ...patch };
    replaceSet(block.exerciseId, set.id, optimistic);
    startTransition(async () => {
      const result = await call(
        saveSet({
          id: set.id,
          session_id: sessionId,
          exercise_id: block.exerciseId,
          weight_lb: optimistic.weight_lb,
          reps: optimistic.reps,
          rpe: optimistic.rpe,
          is_warmup: optimistic.is_warmup,
          set_order: optimistic.set_order,
        }),
      );
      if ("error" in result) {
        replaceSet(block.exerciseId, set.id, set);
        fail(`Edit not saved: ${result.error}`, () => update(block, set, patch));
        return;
      }
      router.refresh();
    });
  }

  function remove(block: Block, set: LoggedSet) {
    replaceSet(block.exerciseId, set.id, null);
    startTransition(async () => {
      const result = await call(deleteLoggedSet(set.id));
      if ("error" in result) {
        setBlocks((current) =>
          current.map((b) =>
            b.exerciseId === block.exerciseId
              ? { ...b, sets: [...b.sets, set].sort((a, c) => a.set_order - c.set_order) }
              : b,
          ),
        );
        fail(`Set not deleted: ${result.error}`, () => remove(block, set));
        return;
      }
      toast("Set deleted");
      router.refresh();
    });
  }

  function add(block: Block) {
    const last = block.sets[block.sets.length - 1];
    const optimistic: LoggedSet = {
      id: `optimistic-${Date.now()}`,
      user_id: "",
      session_id: sessionId,
      exercise_id: block.exerciseId,
      weight_lb: last?.weight_lb ?? 0,
      reps: last?.reps ?? 8,
      rpe: null,
      is_warmup: false,
      set_order: block.sets.length + 1,
      performed_at: new Date().toISOString(),
    };
    setBlocks((current) =>
      current.map((b) =>
        b.exerciseId === block.exerciseId ? { ...b, sets: [...b.sets, optimistic] } : b,
      ),
    );
    startTransition(async () => {
      const result = await call(
        saveSet({
          id: null,
          session_id: sessionId,
          exercise_id: block.exerciseId,
          weight_lb: optimistic.weight_lb,
          reps: optimistic.reps,
          rpe: null,
          is_warmup: false,
          set_order: optimistic.set_order,
        }),
      );
      if ("error" in result) {
        replaceSet(block.exerciseId, optimistic.id, null);
        fail(`Set not added: ${result.error}`, () => add(block));
        return;
      }
      replaceSet(block.exerciseId, optimistic.id, result.set);
      router.refresh();
    });
  }

  return (
    <ul className="space-y-3">
      {blocks.map((block) => {
        let working = 0;
        return (
          <li key={block.exerciseId} className="border-border bg-surface rounded-card border p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-text-hi truncate text-sm font-medium">
                {block.exerciseName}
              </h3>
              <Button variant="quiet" className="px-2 py-1" onClick={() => add(block)}>
                Add set
              </Button>
            </div>
            <ul className="mt-2 space-y-1.5">
              {block.sets.map((set) => {
                const number = set.is_warmup ? null : ++working;
                const isRecord =
                  !set.is_warmup &&
                  block.best !== null &&
                  set.weight_lb * set.reps >= block.best;
                const saving = set.id.startsWith("optimistic-");
                return (
                  <li
                    key={set.id}
                    className={cx(
                      "grid grid-cols-[1.5rem_5rem_4rem_4rem_1fr_1.5rem] items-center gap-2",
                      saving && "opacity-60",
                    )}
                  >
                    {number === null ? (
                      <WarmupIcon />
                    ) : (
                      <span className="num text-text-low text-center text-xs">{number}</span>
                    )}
                    <NumberField
                      aria-label={`${block.exerciseName} set weight`}
                      defaultValue={formatNumber(set.weight_lb, 2)}
                      step="2.5"
                      min="0"
                      disabled={saving}
                      onBlur={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value) && value !== set.weight_lb && value >= 0) {
                          update(block, set, { weight_lb: value });
                        }
                      }}
                      className="py-1"
                    />
                    <NumberField
                      aria-label={`${block.exerciseName} set reps`}
                      defaultValue={set.reps}
                      step="1"
                      min="1"
                      disabled={saving}
                      onBlur={(event) => {
                        const value = Math.trunc(Number(event.target.value));
                        if (Number.isFinite(value) && value !== set.reps && value >= 1) {
                          update(block, set, { reps: value });
                        }
                      }}
                      className="py-1"
                    />
                    <NumberField
                      aria-label={`${block.exerciseName} set RPE`}
                      defaultValue={set.rpe ?? ""}
                      placeholder="—"
                      step="0.5"
                      min="1"
                      max="10"
                      disabled={saving}
                      onBlur={(event) => {
                        const raw = event.target.value;
                        const value = raw === "" ? null : Number(raw);
                        if (value !== set.rpe && (value === null || Number.isFinite(value))) {
                          update(block, set, { rpe: value });
                        }
                      }}
                      className="py-1"
                    />
                    <span>
                      {isRecord && (
                        <span className="border-accent/40 text-accent num rounded-chip border px-1.5 py-0.5 text-xs">
                          PR
                        </span>
                      )}
                    </span>
                    <button
                      aria-label={`Delete set ${number ?? "warm-up"} of ${block.exerciseName}`}
                      className="text-text-low hover:text-negative justify-self-end"
                      disabled={saving}
                      onClick={() => remove(block, set)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4">
                        <path strokeWidth="2" strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </li>
                );
              })}
              {block.sets.length === 0 && (
                <li className="text-text-low text-sm">No sets; add one or this block disappears on reload.</li>
              )}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
