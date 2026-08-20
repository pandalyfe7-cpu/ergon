"use client";

/**
 * The rotation session card: prescribed lifts with deterministic aims, and
 * inline set logging against the open session. Every write is optimistic with
 * rollback and a retry toast. Enter logs a set; everything is reachable by
 * keyboard.
 */

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { useToast } from "@/components/toast";
import { Button, Chip, cx, NumberField, SectionLabel, WarmupIcon } from "@/components/ui";
import { saveSet } from "@/lib/actions";
import { call } from "@/lib/client/call";
import { finishRotationSession, startRotationSession } from "@/lib/ergos/actions";
import { formatNumber } from "@/lib/format";
import type { LoggedSet, Session } from "@/lib/types";

export type LiftRow = {
  exerciseId: string;
  name: string;
  /** Set when the constraint gate swapped this in for a blocked movement. */
  substitutedFor: string | null;
  prescription: { sets: number; rep_min: number; rep_max: number };
  aim: {
    weight_lb: number;
    rep_min: number;
    rep_max: number;
    rule: string;
    reason: string;
  } | null;
};

type OptimisticSet = LoggedSet & { optimistic?: boolean };

export function SessionPanel({
  dayLabel,
  sessionName,
  open,
  openMatchesRotation,
  lifts,
  initialSets,
}: {
  dayLabel: string;
  sessionName: string;
  open: Session | null;
  /** False when the open session belongs to a different template. */
  openMatchesRotation: boolean;
  lifts: LiftRow[];
  initialSets: LoggedSet[];
}) {
  const router = useRouter();
  const { fail, toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [sets, setSets] = useState<OptimisticSet[]>(initialSets);
  const [phase, setPhase] = useState<"idle" | "open" | "finished">(
    open ? "open" : "idle",
  );
  const tempId = useRef(0);

  function start() {
    setPhase("open");
    startTransition(async () => {
      const result = await call(startRotationSession());
      if ("error" in result) {
        setPhase("idle");
        fail(`Could not start session: ${result.error}`, start);
        return;
      }
      router.refresh();
    });
  }

  function finish() {
    setPhase("finished");
    startTransition(async () => {
      const result = await call(finishRotationSession());
      if ("error" in result) {
        setPhase("open");
        fail(`Could not finish session: ${result.error}`, finish);
        return;
      }
      toast("Session finished; rotation advanced");
      router.refresh();
    });
  }

  function logSet(lift: LiftRow, weight: number, reps: number, rpe: number | null, warmup: boolean) {
    if (!open) return;
    const forExercise = sets.filter((s) => s.exercise_id === lift.exerciseId);
    const optimistic: OptimisticSet = {
      id: `optimistic-${tempId.current++}`,
      user_id: "",
      session_id: open.id,
      exercise_id: lift.exerciseId,
      weight_lb: weight,
      reps,
      rpe,
      is_warmup: warmup,
      set_order: forExercise.length + 1,
      performed_at: new Date().toISOString(),
      optimistic: true,
    };
    setSets((current) => [...current, optimistic]);

    startTransition(async () => {
      const result = await call(
        saveSet({
          id: null,
          session_id: open.id,
          exercise_id: lift.exerciseId,
          weight_lb: weight,
          reps,
          rpe,
          is_warmup: warmup,
          set_order: optimistic.set_order,
        }),
      );
      if ("error" in result) {
        setSets((current) => current.filter((s) => s.id !== optimistic.id));
        fail(`Set not saved: ${result.error}`, () =>
          logSet(lift, weight, reps, rpe, warmup),
        );
        return;
      }
      setSets((current) =>
        current.map((s) => (s.id === optimistic.id ? { ...result.set } : s)),
      );
    });
  }

  const isOpen = phase === "open" && open !== null;

  return (
    <section className="border-border bg-surface rounded-card border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <SectionLabel>{dayLabel}</SectionLabel>
          <h2 className="text-text-hi mt-1 text-xl font-semibold">{sessionName}</h2>
        </div>
        {phase === "idle" && (
          <Button variant="primary" onClick={start} disabled={pending}>
            Start {sessionName}
          </Button>
        )}
        {isOpen && openMatchesRotation && (
          <Button variant="secondary" onClick={finish} disabled={pending}>
            Finish session
          </Button>
        )}
      </div>

      {isOpen && !openMatchesRotation && (
        <p className="text-text-mid mt-3 text-sm">
          A session from another day is still open. Finish it below before starting{" "}
          {sessionName}.
          <Button variant="secondary" onClick={finish} disabled={pending} className="ml-3">
            Finish open session
          </Button>
        </p>
      )}

      {phase === "finished" && (
        <p className="text-positive mt-3 text-sm">
          Session logged. The rotation has moved on.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {lifts.map((lift) => (
          <ExerciseBlock
            key={lift.exerciseId}
            lift={lift}
            logging={isOpen && openMatchesRotation}
            sets={sets.filter((s) => s.exercise_id === lift.exerciseId)}
            onLog={logSet}
          />
        ))}
      </ul>
    </section>
  );
}

function ExerciseBlock({
  lift,
  logging,
  sets,
  onLog,
}: {
  lift: LiftRow;
  logging: boolean;
  sets: OptimisticSet[];
  onLog: (lift: LiftRow, weight: number, reps: number, rpe: number | null, warmup: boolean) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [warmup, setWarmup] = useState(false);
  const done = sets.filter((s) => !s.is_warmup).length;

  function submit(formData: FormData) {
    const weight = Number(formData.get("weight"));
    const reps = Number(formData.get("reps"));
    const rpeRaw = formData.get("rpe");
    const rpe = rpeRaw === null || rpeRaw === "" ? null : Number(rpeRaw);
    if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps < 1) return;
    onLog(lift, weight, reps, rpe, warmup);
    setWarmup(false);
    const repsInput = formRef.current?.elements.namedItem("reps") as HTMLInputElement | null;
    const rpeInput = formRef.current?.elements.namedItem("rpe") as HTMLInputElement | null;
    if (rpeInput) rpeInput.value = "";
    repsInput?.focus();
    repsInput?.select();
  }

  return (
    <li className="border-border rounded-control border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-text-hi text-sm font-medium">{lift.name}</h3>
          {lift.substitutedFor && (
            <p className="text-text-mid text-xs">
              substituted for a movement blocked by the constraint table
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Chip tone="mid">
            {lift.prescription.sets}×{lift.prescription.rep_min}-{lift.prescription.rep_max}
          </Chip>
          {lift.aim ? (
            <Chip tone="accent" className="cursor-help" title={lift.aim.reason}>
              aim {formatNumber(lift.aim.weight_lb)} lb · {lift.aim.rule}
            </Chip>
          ) : (
            <Chip tone="mid">first time; pick a light weight</Chip>
          )}
        </div>
      </div>

      {sets.length > 0 && (
        <table className="num mt-2 w-full text-sm">
          <thead>
            <tr className="text-text-low text-left text-xs">
              <th className="w-8 py-1 font-normal">#</th>
              <th className="py-1 font-normal">lb</th>
              <th className="py-1 font-normal">reps</th>
              <th className="py-1 font-normal">RPE</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set, index) => (
              <tr
                key={set.id}
                className={cx(
                  "border-border border-t",
                  set.optimistic ? "text-text-mid" : "pulse-positive text-text-hi",
                )}
              >
                <td className="py-1.5">
                  {set.is_warmup ? <WarmupIcon /> : index + 1}
                </td>
                <td className="py-1.5">{formatNumber(set.weight_lb)}</td>
                <td className="py-1.5">{set.reps}</td>
                <td className="py-1.5">{set.rpe === null ? "—" : formatNumber(set.rpe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {logging && done < lift.prescription.sets + 2 && (
        <form ref={formRef} action={submit} className="mt-2 flex items-end gap-2">
          <label className="block w-24">
            <span className="text-text-low text-xs">lb</span>
            <NumberField
              name="weight"
              step="2.5"
              min="0"
              required
              defaultValue={lift.aim?.weight_lb ?? ""}
              aria-label={`${lift.name} weight`}
            />
          </label>
          <label className="block w-20">
            <span className="text-text-low text-xs">reps</span>
            <NumberField
              name="reps"
              step="1"
              min="1"
              required
              defaultValue={lift.aim?.rep_min ?? lift.prescription.rep_min}
              aria-label={`${lift.name} reps`}
            />
          </label>
          <label className="block w-20">
            <span className="text-text-low text-xs">RPE</span>
            <NumberField
              name="rpe"
              step="0.5"
              min="1"
              max="10"
              placeholder="—"
              aria-label={`${lift.name} RPE`}
            />
          </label>
          <button
            type="button"
            aria-pressed={warmup}
            onClick={() => setWarmup((v) => !v)}
            className={cx(
              "rounded-control border px-2 py-2 text-xs",
              warmup
                ? "border-accent/40 text-accent bg-accent-soft"
                : "border-border text-text-low hover:text-text-mid",
            )}
            title="Warm-up set"
          >
            W
          </button>
          <Button type="submit" variant="secondary" className="px-3 py-2">
            Log
          </Button>
        </form>
      )}
    </li>
  );
}
