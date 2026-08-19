"use client";

import { useState } from "react";

import { CheckIcon, NumberField, WarmupIcon } from "@/components/ui";
import { saveSet } from "@/lib/actions";
import { formatNumber } from "@/lib/format";
import type { Aim } from "@/lib/training/aim";
import { workingSets } from "@/lib/training/sets";
import { getLoadCeilingLb, type Exercise, type LoggedSet } from "@/lib/types";

type Row = {
  key: string;
  id: string | null;
  set_order: number;
  weight: string;
  reps: string;
  rpe: string;
  is_warmup: boolean;
  dirty: boolean;
};

function toRow(set: LoggedSet, key = set.id): Row {
  return {
    key,
    id: set.id,
    set_order: set.set_order,
    weight: String(set.weight_lb),
    reps: String(set.reps),
    rpe: set.rpe === null ? "" : String(set.rpe),
    is_warmup: set.is_warmup,
    dirty: false,
  };
}

/**
 * Blank stays blank: an unrated set writes null, which progression reads as
 * "hold" rather than inventing an effort level.
 */
function parseRpe(value: string): { rpe: number | null } | { error: string } {
  if (value.trim() === "") return { rpe: null };
  const rpe = Number(value);
  if (!Number.isFinite(rpe) || rpe < 1 || rpe > 10) return { error: "RPE is 1 to 10." };
  return { rpe };
}

const CELL =
  "grid grid-cols-[1.5rem_3rem_1fr_1fr_2.75rem_1.75rem_1.75rem] items-center gap-1.5";

export function SetsTable({
  sessionId,
  exercise,
  sets,
  previous,
  aim,
  onSaved,
}: {
  sessionId: string;
  exercise: Exercise;
  sets: LoggedSet[];
  previous: LoggedSet[];
  aim: Aim | null;
  onSaved: (set: LoggedSet) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    [...sets].sort((a, b) => a.set_order - b.set_order).map((set) => toRow(set)),
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ceiling = getLoadCeilingLb(exercise.constraints);
  const previousWorking = workingSets(previous);

  function update(key: string, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch, dirty: true } : row)),
    );
  }

  function addRow() {
    const nextOrder = rows.reduce((max, row) => Math.max(max, row.set_order), 0) + 1;
    setRows((current) => [
      ...current,
      {
        key: `draft-${nextOrder}-${Date.now()}`,
        id: null,
        set_order: nextOrder,
        weight: aim ? String(aim.weight_lb) : "",
        reps: "",
        rpe: "",
        is_warmup: false,
        dirty: true,
      },
    ]);
  }

  async function confirm(row: Row) {
    const weight_lb = Number(row.weight);
    const reps = Number(row.reps);

    if (row.weight === "" || row.reps === "" || !Number.isFinite(weight_lb) || !Number.isFinite(reps)) {
      setError("Enter weight and reps.");
      return;
    }

    const rpe = parseRpe(row.rpe);
    if ("error" in rpe) {
      setError(rpe.error);
      return;
    }

    setError(null);
    setPendingKey(row.key);

    const result = await saveSet({
      id: row.id,
      session_id: sessionId,
      exercise_id: exercise.id,
      weight_lb,
      reps,
      rpe: rpe.rpe,
      is_warmup: row.is_warmup,
      set_order: row.set_order,
    });

    setPendingKey(null);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setRows((current) =>
      current.map((item) => (item.key === row.key ? toRow(result.set, item.key) : item)),
    );
    onSaved(result.set);
  }

  let workingNumber = 0;

  return (
    <div>
      <div className={`${CELL} text-fg-dim mb-1 text-[10px] tracking-widest uppercase`}>
        <span>Set</span>
        <span>Prev</span>
        <span className="text-right">lb</span>
        <span className="text-right">Reps</span>
        <span className="text-right">RPE</span>
        <span />
        <span />
      </div>

      <ul className="space-y-1.5">
        {rows.map((row) => {
          const number = row.is_warmup ? null : ++workingNumber;
          const ghost = number === null ? undefined : previousWorking[number - 1];
          const overCeiling =
            ceiling !== null && row.weight !== "" && Number(row.weight) > ceiling;

          return (
            <li key={row.key} className={CELL}>
              {number === null ? (
                <WarmupIcon />
              ) : (
                <span className="num text-fg-dim text-center text-xs">{number}</span>
              )}

              <span className="num text-fg-dim text-[11px]">
                {ghost ? `${formatNumber(ghost.weight_lb)}\u00d7${ghost.reps}` : "\u2014"}
              </span>

              <NumberField
                value={row.weight}
                onChange={(event) => update(row.key, { weight: event.target.value })}
                className={overCeiling ? "text-status-red border-status-red" : undefined}
              />

              <NumberField
                value={row.reps}
                onChange={(event) => update(row.key, { reps: event.target.value })}
              />

              <NumberField
                value={row.rpe}
                aria-label="RPE, optional"
                placeholder={"\u2013"}
                onChange={(event) => update(row.key, { rpe: event.target.value })}
                className="placeholder:text-fg-dim text-xs"
              />

              <button
                type="button"
                aria-label="Warm-up"
                aria-pressed={row.is_warmup}
                onClick={() => update(row.key, { is_warmup: !row.is_warmup })}
                className={`rounded border py-1.5 ${
                  row.is_warmup
                    ? "border-accent text-accent"
                    : "border-border text-fg-dim"
                }`}
              >
                <WarmupIcon />
              </button>

              <button
                type="button"
                aria-label="Confirm set"
                disabled={pendingKey === row.key}
                onClick={() => void confirm(row)}
                className={`flex items-center justify-center rounded py-1.5 disabled:opacity-40 ${
                  row.dirty ? "text-accent" : "text-fg-dim"
                }`}
              >
                <CheckIcon />
              </button>
            </li>
          );
        })}
      </ul>

      {error ? <p className="text-status-red mt-2 text-xs">{error}</p> : null}

      <button
        type="button"
        onClick={addRow}
        className="border-border text-fg-dim hover:text-fg hover:border-border-strong mt-2 w-full rounded-md border border-dashed py-2 text-xs"
      >
        Add set
      </button>
    </div>
  );
}
