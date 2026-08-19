"use client";

import { useState, useTransition } from "react";

import { Button, ConstraintBadges, NumberField } from "@/components/ui";
import { recordDecision } from "@/lib/coach/actions";
import type { CoachTarget } from "@/lib/coach/data";
import { formatNumber } from "@/lib/format";

type Settled = { accepted: boolean; weight_lb: number; rep_min: number; rep_max: number };

export function TargetCard({ target }: { target: CoachTarget }) {
  const { exercise, aim } = target;

  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState(String(aim.weight_lb));
  const [repMin, setRepMin] = useState(String(aim.rep_min));
  const [repMax, setRepMax] = useState(String(aim.rep_max));
  const [settled, setSettled] = useState<Settled | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(override: { weight_lb: number; rep_min: number; rep_max: number } | null) {
    setError(null);
    startTransition(async () => {
      const result = await recordDecision(exercise.id, override);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setEditing(false);
      setSettled({
        accepted: override === null,
        weight_lb: override?.weight_lb ?? aim.weight_lb,
        rep_min: override?.rep_min ?? aim.rep_min,
        rep_max: override?.rep_max ?? aim.rep_max,
      });
    });
  }

  function save() {
    const weight_lb = Number(weight);
    const rep_min = Number(repMin);
    const rep_max = Number(repMax);

    if (weight === "" || !Number.isFinite(weight_lb) || weight_lb < 0) {
      setError("Weight must be zero or more.");
      return;
    }
    if (!Number.isFinite(rep_min) || !Number.isFinite(rep_max) || rep_min < 1) {
      setError("Reps must be at least one.");
      return;
    }
    if (rep_max < rep_min) {
      setError("Rep range is backwards.");
      return;
    }

    submit({ weight_lb, rep_min, rep_max });
  }

  const delta = aim.weight_lb - aim.current_weight_lb;

  return (
    <li className="border-border bg-surface rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{exercise.name}</p>
          <p className="text-fg-dim num mt-0.5 text-[11px]">
            Now {formatNumber(aim.current_weight_lb)} lb
            {aim.avg_rpe === null ? "" : `, RPE ${formatNumber(aim.avg_rpe)}`}
          </p>
        </div>
        <p className="num shrink-0 text-right">
          <span className={`text-base ${delta > 0 ? "text-status-green" : ""}`}>
            {formatNumber(aim.weight_lb)} lb
          </span>
          <span className="text-fg-dim block text-[11px]">
            {aim.rep_min}
            {"\u2013"}
            {aim.rep_max} reps
          </span>
        </p>
      </div>

      <p className="text-fg-dim mt-2 text-xs">{aim.reason}</p>

      {exercise.constraints.length > 0 ? (
        <div className="mt-2">
          <ConstraintBadges constraints={exercise.constraints} />
        </div>
      ) : null}

      {settled ? (
        <p className="text-fg-dim num mt-3 text-xs">
          {settled.accepted ? "Accepted" : "Saved"} {formatNumber(settled.weight_lb)} lb,{" "}
          {settled.rep_min}
          {"\u2013"}
          {settled.rep_max} reps
        </p>
      ) : editing ? (
        <div className="mt-3">
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
            <label className="text-fg-dim text-[10px] tracking-widest uppercase">
              lb
              <NumberField
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                className="mt-1"
              />
            </label>
            <label className="text-fg-dim text-[10px] tracking-widest uppercase">
              Min
              <NumberField
                value={repMin}
                onChange={(event) => setRepMin(event.target.value)}
                className="mt-1"
              />
            </label>
            <label className="text-fg-dim text-[10px] tracking-widest uppercase">
              Max
              <NumberField
                value={repMax}
                onChange={(event) => setRepMax(event.target.value)}
                className="mt-1"
              />
            </label>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              variant="primary"
              disabled={pending}
              onClick={save}
              className="flex-1 py-1.5 text-xs"
            >
              Save
            </Button>
            <Button
              variant="quiet"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="py-1.5 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => submit(null)}
            className="flex-1 py-1.5 text-xs"
          >
            Accept
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => setEditing(true)}
            className="py-1.5 text-xs"
          >
            Edit
          </Button>
        </div>
      )}

      {error ? <p className="text-status-red mt-2 text-xs">{error}</p> : null}
    </li>
  );
}
