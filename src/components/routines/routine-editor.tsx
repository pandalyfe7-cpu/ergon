"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  Button,
  NumberField,
  Panel,
  SectionLabel,
  Select,
  TextField,
} from "@/components/ui";
import { deleteTemplate, saveTemplate } from "@/lib/actions";
import { DEFAULT_REP_RANGE } from "@/lib/training/aim";
import type { Exercise, ExerciseTemplate } from "@/lib/types";

const DEFAULT_SETS = 3;

/** Numbers are held as strings so the fields stay editable while typing. */
type Row = {
  key: string;
  exercise_id: string;
  prescribed_sets: string;
  rep_min: string;
  rep_max: string;
};

export function RoutineEditor({
  template,
  library,
}: {
  template: ExerciseTemplate | null;
  library: Exercise[];
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [rows, setRows] = useState<Row[]>(
    () =>
      template?.exercises.map((row, index) => ({
        key: `row-${index}`,
        exercise_id: row.exercise_id,
        prescribed_sets: String(row.prescribed_sets),
        rep_min: String(row.rep_min),
        rep_max: String(row.rep_max),
      })) ?? [],
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (library.length === 0) {
    return (
      <Panel>
        <p className="text-fg-dim text-sm">
          No exercises yet. A routine is built from the library.
        </p>
        <Link
          href="/exercises/new"
          className="text-accent mt-2 inline-block text-sm underline"
        >
          New exercise
        </Link>
      </Panel>
    );
  }

  function update(key: string, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function move(index: number, direction: -1 | 1) {
    setRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        key: `row-${Date.now()}`,
        exercise_id: library[0].id,
        prescribed_sets: String(DEFAULT_SETS),
        rep_min: String(DEFAULT_REP_RANGE.rep_min),
        rep_max: String(DEFAULT_REP_RANGE.rep_max),
      },
    ]);
  }

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    startTransition(async () => {
      const result = await saveTemplate({
        id: template?.id ?? null,
        name,
        exercises: rows.map((row) => ({
          exercise_id: row.exercise_id,
          prescribed_sets: Number(row.prescribed_sets),
          rep_min: Number(row.rep_min),
          rep_max: Number(row.rep_max),
        })),
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <Panel>
        <SectionLabel>Name</SectionLabel>
        <TextField
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Upper A"
          className="mt-2"
        />
      </Panel>

      <Panel>
        <SectionLabel>Exercises</SectionLabel>

        <ul className="mt-3 space-y-2">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className="border-border bg-surface-raised space-y-2 rounded-md border p-3"
            >
              <div className="flex items-center gap-2">
                <Select
                  value={row.exercise_id}
                  aria-label="Exercise"
                  onChange={(event) =>
                    update(row.key, { exercise_id: event.target.value })
                  }
                >
                  {library.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </Select>

                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="border-border text-fg-dim hover:text-fg size-8 shrink-0 rounded-md border leading-none disabled:opacity-30"
                >
                  {"\u2191"}
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === rows.length - 1}
                  onClick={() => move(index, 1)}
                  className="border-border text-fg-dim hover:text-fg size-8 shrink-0 rounded-md border leading-none disabled:opacity-30"
                >
                  {"\u2193"}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-fg-dim text-[11px]">Sets</span>
                  <NumberField
                    value={row.prescribed_sets}
                    onChange={(event) =>
                      update(row.key, { prescribed_sets: event.target.value })
                    }
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-fg-dim text-[11px]">Rep min</span>
                  <NumberField
                    value={row.rep_min}
                    onChange={(event) => update(row.key, { rep_min: event.target.value })}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-fg-dim text-[11px]">Rep max</span>
                  <NumberField
                    value={row.rep_max}
                    onChange={(event) => update(row.key, { rep_max: event.target.value })}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRows((current) => current.filter((item) => item.key !== row.key))
                }
                className="text-fg-dim hover:text-fg text-xs"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={addRow}
          className="border-border text-fg-dim hover:text-fg hover:border-border-strong mt-2 w-full rounded-md border border-dashed py-2 text-xs"
        >
          Add exercise
        </button>
      </Panel>

      {error ? <p className="text-status-red text-xs">{error}</p> : null}

      <Button variant="primary" className="w-full" disabled={pending} onClick={submit}>
        Save
      </Button>

      {template ? (
        <Button
          variant="quiet"
          className={`w-full ${confirmingDelete ? "text-status-red" : ""}`}
          disabled={pending}
          onClick={() => {
            if (!confirmingDelete) {
              setConfirmingDelete(true);
              return;
            }
            startTransition(async () => {
              await deleteTemplate(template.id);
            });
          }}
        >
          {confirmingDelete ? "Confirm delete" : "Delete"}
        </Button>
      ) : null}
    </div>
  );
}
