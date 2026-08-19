"use client";

import { useState, useTransition } from "react";

import {
  Button,
  ConstraintBadges,
  NumberField,
  Panel,
  SectionLabel,
  Select,
  TextField,
} from "@/components/ui";
import { saveExercise } from "@/lib/actions";
import { formatMuscleGroup } from "@/lib/format";
import {
  CONSTRAINT_TYPES,
  DEFAULT_ROM_LIMIT,
  MUSCLE_GROUPS,
  type ConstraintType,
  type Exercise,
  type ExerciseConstraint,
  type MuscleGroup,
  type StimulusWeights,
} from "@/lib/types";

/** Tags map to these weights; the editor never asks for a number. */
const PRIMARY = 1;
const SECONDARY = 0.5;

/** Parameters are held as strings so the fields stay editable while typing. */
type Draft = {
  key: string;
  type: ConstraintType;
  min_degrees: string;
  max_degrees: string;
  max_load_lb: string;
  note: string;
};

function newDraft(type: ConstraintType): Draft {
  return {
    key: `${type}-${Date.now()}`,
    type,
    min_degrees: String(DEFAULT_ROM_LIMIT.min_degrees),
    max_degrees: String(DEFAULT_ROM_LIMIT.max_degrees),
    max_load_lb: "",
    note: "",
  };
}

function toDraft(constraint: ExerciseConstraint, index: number): Draft {
  return {
    key: `${constraint.type}-${index}`,
    type: constraint.type,
    min_degrees: String(
      constraint.type === "ROM_LIMIT"
        ? constraint.min_degrees
        : DEFAULT_ROM_LIMIT.min_degrees,
    ),
    max_degrees: String(
      constraint.type === "ROM_LIMIT"
        ? constraint.max_degrees
        : DEFAULT_ROM_LIMIT.max_degrees,
    ),
    max_load_lb: constraint.type === "LOAD_CEILING" ? String(constraint.max_load_lb) : "",
    note: constraint.note ?? "",
  };
}

function toConstraint(draft: Draft): ExerciseConstraint {
  const note = draft.note.trim() ? draft.note.trim() : null;

  switch (draft.type) {
    case "ROM_LIMIT":
      return {
        type: "ROM_LIMIT",
        min_degrees: Number(draft.min_degrees) || 0,
        max_degrees: Number(draft.max_degrees) || 0,
        note,
      };
    case "LOAD_CEILING":
      return { type: "LOAD_CEILING", max_load_lb: Number(draft.max_load_lb) || 0, note };
    case "SEATED":
      return { type: "SEATED", note };
    case "NO_AXIAL":
      return { type: "NO_AXIAL", note };
    case "NO_VALSALVA":
      return { type: "NO_VALSALVA", note };
  }
}

export function ExerciseEditor({ exercise }: { exercise: Exercise | null }) {
  const [name, setName] = useState(exercise?.name ?? "");
  const [weights, setWeights] = useState<StimulusWeights>(
    exercise?.stimulus_weights ?? {},
  );
  const [drafts, setDrafts] = useState<Draft[]>(
    () => exercise?.constraints.map(toDraft) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const used = new Set(drafts.map((draft) => draft.type));
  const preview = drafts.map(toConstraint);

  function cycle(muscle: MuscleGroup) {
    setWeights((current) => {
      const next = { ...current };
      if (next[muscle] === undefined) next[muscle] = PRIMARY;
      else if (next[muscle] === PRIMARY) next[muscle] = SECONDARY;
      else delete next[muscle];
      return next;
    });
  }

  function update(key: string, patch: Partial<Draft>) {
    setDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)),
    );
  }

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    startTransition(async () => {
      const result = await saveExercise({
        id: exercise?.id ?? null,
        name,
        stimulus_weights: weights,
        constraints: preview,
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
          placeholder="Overhead press"
          className="mt-2"
        />
      </Panel>

      <Panel>
        <SectionLabel>Muscles</SectionLabel>
        <p className="text-fg-dim mt-1 text-[11px]">
          Tap to cycle primary, secondary, off.
        </p>

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {MUSCLE_GROUPS.map((muscle) => {
            const weight = weights[muscle];
            return (
              <li key={muscle}>
                <button
                  type="button"
                  onClick={() => cycle(muscle)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    weight === PRIMARY
                      ? "border-accent text-accent"
                      : weight === SECONDARY
                        ? "border-border-strong text-fg"
                        : "border-border text-fg-dim"
                  }`}
                >
                  {formatMuscleGroup(muscle)}
                  {weight === undefined ? null : (
                    <span className="num ml-1.5">{weight.toFixed(1)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel>
        <SectionLabel>Constraints</SectionLabel>

        <div className="mt-2 min-h-6">
          {preview.length > 0 ? (
            <ConstraintBadges constraints={preview} />
          ) : (
            <p className="text-fg-dim text-[11px]">No constraints.</p>
          )}
        </div>

        <ul className="mt-3 space-y-2">
          {drafts.map((draft) => (
            <li
              key={draft.key}
              className="border-border bg-surface-raised space-y-2 rounded-md border p-3"
            >
              <div className="flex items-center justify-between">
                <span className="num text-xs tracking-wider">{draft.type}</span>
                <button
                  type="button"
                  onClick={() =>
                    setDrafts((current) => current.filter((d) => d.key !== draft.key))
                  }
                  className="text-fg-dim hover:text-fg text-xs"
                >
                  Remove
                </button>
              </div>

              {draft.type === "ROM_LIMIT" ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-fg-dim text-[11px]">Min degrees</span>
                    <NumberField
                      value={draft.min_degrees}
                      onChange={(event) =>
                        update(draft.key, { min_degrees: event.target.value })
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-fg-dim text-[11px]">Max degrees</span>
                    <NumberField
                      value={draft.max_degrees}
                      onChange={(event) =>
                        update(draft.key, { max_degrees: event.target.value })
                      }
                    />
                  </label>
                </div>
              ) : null}

              {draft.type === "LOAD_CEILING" ? (
                <label className="block space-y-1">
                  <span className="text-fg-dim text-[11px]">Max load lb</span>
                  <NumberField
                    value={draft.max_load_lb}
                    onChange={(event) =>
                      update(draft.key, { max_load_lb: event.target.value })
                    }
                  />
                </label>
              ) : null}

              <label className="block space-y-1">
                <span className="text-fg-dim text-[11px]">Note</span>
                <TextField
                  value={draft.note}
                  onChange={(event) => update(draft.key, { note: event.target.value })}
                />
              </label>
            </li>
          ))}
        </ul>

        <Select
          value=""
          aria-label="Add constraint"
          className="mt-2"
          onChange={(event) => {
            const type = event.target.value as ConstraintType;
            if (type) setDrafts((current) => [...current, newDraft(type)]);
          }}
        >
          <option value="">Add constraint</option>
          {CONSTRAINT_TYPES.filter((type) => !used.has(type)).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </Panel>

      {error ? <p className="text-status-red text-xs">{error}</p> : null}

      <Button
        variant="primary"
        className="w-full"
        disabled={pending}
        onClick={submit}
      >
        Save
      </Button>
    </div>
  );
}
