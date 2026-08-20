"use client";

/**
 * Settings write surfaces. Every control saves optimistically on change and
 * rolls back with a retryable failure toast, matching the app's write rules.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useToast } from "@/components/toast";
import { Button, Card, cx, NumberField, SectionLabel, Select } from "@/components/ui";
import { call } from "@/lib/client/call";
import { DEFAULT_WEIGHTS, WEIGHT_DESCRIPTIONS, type WeightsConfig } from "@/lib/engine/weights";
import {
  updateConstraintRuleActive,
  updateDefaultTimeAvailable,
  updateEngineWeights,
  updateHabitBedtime,
  updateMetricTarget,
  updateRotationPosition,
} from "@/lib/ergos/actions";
import { formatNumber } from "@/lib/format";

// Rotation --------------------------------------------------------------------

export function RotationCard({
  position,
  sessionNames,
}: {
  position: number;
  sessionNames: string[];
}) {
  const router = useRouter();
  const { fail, toast } = useToast();
  const [, startTransition] = useTransition();
  const [value, setValue] = useState(position);

  function save(next: number) {
    const prev = value;
    setValue(next);
    startTransition(async () => {
      const result = await call(updateRotationPosition(next));
      if ("error" in result) {
        setValue(prev);
        fail(`Rotation not saved: ${result.error}`, () => save(next));
        return;
      }
      toast(`Next session: ${sessionNames[next] ?? next + 1}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <SectionLabel>Rotation</SectionLabel>
      <p className="text-text-mid mt-2 text-sm">
        Which of the six sessions Today prescribes next. Finishing a session
        advances it automatically.
      </p>
      <label className="mt-3 block">
        <span className="text-text-low text-xs">Next session</span>
        <Select
          className="mt-1 w-full max-w-xs"
          value={value}
          onChange={(event) => save(Number(event.target.value))}
        >
          {sessionNames.map((name, index) => (
            <option key={name} value={index}>
              {index + 1} · {name}
            </option>
          ))}
        </Select>
      </label>
    </Card>
  );
}

// Defaults ---------------------------------------------------------------------

export function DefaultsCard({
  defaultTimeAvailable,
  bedtime,
}: {
  defaultTimeAvailable: number;
  bedtime: string | null;
}) {
  const router = useRouter();
  const { fail, toast } = useToast();
  const [, startTransition] = useTransition();

  function saveTime(minutes: number) {
    startTransition(async () => {
      const result = await call(updateDefaultTimeAvailable(minutes));
      if ("error" in result) {
        fail(`Not saved: ${result.error}`, () => saveTime(minutes));
        return;
      }
      toast("Default time saved");
      router.refresh();
    });
  }

  function saveBedtime(time: string) {
    startTransition(async () => {
      const result = await call(updateHabitBedtime(time));
      if ("error" in result) {
        fail(`Not saved: ${result.error}`, () => saveBedtime(time));
        return;
      }
      toast("Bed time saved");
      router.refresh();
    });
  }

  return (
    <Card>
      <SectionLabel>Defaults</SectionLabel>
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="block">
          <span className="text-text-low text-xs">Time available, minutes/day</span>
          <NumberField
            className="mt-1 w-32"
            defaultValue={defaultTimeAvailable}
            min="5"
            step="5"
            onBlur={(event) => {
              const minutes = Math.trunc(Number(event.target.value));
              if (Number.isFinite(minutes) && minutes > 0 && minutes !== defaultTimeAvailable) {
                saveTime(minutes);
              }
            }}
          />
        </label>
        {bedtime !== null && (
          <label className="block">
            <span className="text-text-low text-xs">Target bed time</span>
            <input
              type="time"
              className="border-border bg-surface-2 text-text-hi rounded-control num focus-visible:outline-accent mt-1 block border px-2.5 py-1.5 text-sm"
              defaultValue={bedtime}
              onBlur={(event) => {
                if (event.target.value && event.target.value !== bedtime) {
                  saveBedtime(event.target.value);
                }
              }}
            />
          </label>
        )}
      </div>
      <p className="text-text-low mt-2 text-xs">
        Morning entry can override time for one day. Bed time drives the
        window for the sleep timing habit.
      </p>
    </Card>
  );
}

// Targets ---------------------------------------------------------------------

export type TargetRow = {
  slug: string;
  name: string;
  unit: string;
  target:
    | { type: "static"; floor: number; ceiling: number }
    | {
        type: "derived_protein";
        g_per_lb: number;
        ceiling_offset: number;
        floor: number;
        ceiling: number;
        source_weight_lb: number | null;
      };
};

export function TargetsCard({ metrics }: { metrics: TargetRow[] }) {
  const router = useRouter();
  const { fail, toast } = useToast();
  const [, startTransition] = useTransition();

  function save(
    slug: string,
    patch: { floor?: number; ceiling?: number; g_per_lb?: number; ceiling_offset?: number },
  ) {
    startTransition(async () => {
      const result = await call(updateMetricTarget(slug, patch));
      if ("error" in result) {
        fail(`Target not saved: ${result.error}`, () => save(slug, patch));
        return;
      }
      toast("Target saved");
      router.refresh();
    });
  }

  return (
    <Card>
      <SectionLabel>Targets</SectionLabel>
      <ul className="mt-3 space-y-4">
        {metrics.map((metric) => {
          const target = metric.target;
          return (
            <li key={metric.slug}>
              <p className="text-text-hi text-sm font-medium">
                {metric.name}
                <span className="text-text-low text-xs font-normal"> · {metric.unit}</span>
              </p>
              {target.type === "static" ? (
                <div className="mt-1.5 flex items-end gap-3">
                  <label className="block">
                    <span className="text-text-low text-xs">Floor</span>
                    <NumberField
                      className="mt-1 w-24"
                      defaultValue={target.floor}
                      onBlur={(event) => {
                        const floor = Number(event.target.value);
                        if (Number.isFinite(floor) && floor !== target.floor) {
                          save(metric.slug, { floor });
                        }
                      }}
                    />
                  </label>
                  <label className="block">
                    <span className="text-text-low text-xs">Ceiling</span>
                    <NumberField
                      className="mt-1 w-24"
                      defaultValue={target.ceiling}
                      onBlur={(event) => {
                        const ceiling = Number(event.target.value);
                        if (Number.isFinite(ceiling) && ceiling !== target.ceiling) {
                          save(metric.slug, { ceiling });
                        }
                      }}
                    />
                  </label>
                </div>
              ) : (
                <>
                  <div className="mt-1.5 flex items-end gap-3">
                    <label className="block">
                      <span className="text-text-low text-xs">g per lb bodyweight</span>
                      <NumberField
                        className="mt-1 w-24"
                        defaultValue={target.g_per_lb}
                        step="0.1"
                        min="0.1"
                        max="3"
                        onBlur={(event) => {
                          const g_per_lb = Number(event.target.value);
                          if (Number.isFinite(g_per_lb) && g_per_lb !== target.g_per_lb) {
                            save(metric.slug, { g_per_lb });
                          }
                        }}
                      />
                    </label>
                    <label className="block">
                      <span className="text-text-low text-xs">Ceiling offset, g</span>
                      <NumberField
                        className="mt-1 w-24"
                        defaultValue={target.ceiling_offset}
                        step="5"
                        min="0"
                        onBlur={(event) => {
                          const ceiling_offset = Number(event.target.value);
                          if (
                            Number.isFinite(ceiling_offset) &&
                            ceiling_offset !== target.ceiling_offset
                          ) {
                            save(metric.slug, { ceiling_offset });
                          }
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-text-low num mt-1.5 text-xs">
                    Currently {formatNumber(target.floor, 0)}–
                    {formatNumber(target.ceiling, 0)} g
                    {target.source_weight_lb !== null &&
                      `, derived from ${formatNumber(target.source_weight_lb, 1)} lb 7-day average`}
                    . Recomputes weekly.
                  </p>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// Constraint table ---------------------------------------------------------------

export type ConstraintRow = {
  rule_id: string;
  description: string;
  active: boolean;
};

export function ConstraintsCard({ rules }: { rules: ConstraintRow[] }) {
  const router = useRouter();
  const { fail, toast } = useToast();
  const [, startTransition] = useTransition();
  const [states, setStates] = useState(
    Object.fromEntries(rules.map((rule) => [rule.rule_id, rule.active])),
  );

  function toggle(ruleId: string) {
    const next = !states[ruleId];
    setStates((current) => ({ ...current, [ruleId]: next }));
    startTransition(async () => {
      const result = await call(updateConstraintRuleActive(ruleId, next));
      if ("error" in result) {
        setStates((current) => ({ ...current, [ruleId]: !next }));
        fail(`Rule not saved: ${result.error}`, () => toggle(ruleId));
        return;
      }
      toast(next ? "Rule active" : "Rule off");
      router.refresh();
    });
  }

  return (
    <Card>
      <SectionLabel>Constraint table</SectionLabel>
      <p className="text-text-mid mt-2 text-sm">
        The gate filters every recommendation last, after scoring. Turning a
        rule off is a medical decision; the app never does it for you.
      </p>
      <ul className="mt-3 space-y-2">
        {rules.map((rule) => {
          const active = states[rule.rule_id];
          return (
            <li key={rule.rule_id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-text-hi text-sm">{rule.description}</p>
                <p className="num text-text-low text-xs">{rule.rule_id}</p>
              </div>
              <button
                role="switch"
                aria-checked={active}
                aria-label={`Rule ${rule.rule_id} ${active ? "active" : "off"}`}
                onClick={() => toggle(rule.rule_id)}
                className={cx(
                  "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-120",
                  active ? "border-accent bg-accent/30" : "border-border bg-surface-2",
                )}
              >
                <span
                  className={cx(
                    "absolute top-0.5 size-3.5 rounded-full transition-transform duration-120",
                    active ? "bg-accent translate-x-[1.125rem]" : "bg-text-low translate-x-0.5",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// Engine weights -------------------------------------------------------------------

export function WeightsCard({ weights }: { weights: WeightsConfig }) {
  const router = useRouter();
  const { fail, toast } = useToast();
  const [, startTransition] = useTransition();
  const [values, setValues] = useState<WeightsConfig>(weights);
  // Last successfully persisted weights; failures roll back to this, not to
  // the in-progress edit the controlled inputs already hold.
  const [saved, setSaved] = useState<WeightsConfig>(weights);

  function persist(next: WeightsConfig, message: string) {
    setValues(next);
    startTransition(async () => {
      const result = await call(updateEngineWeights(next));
      if ("error" in result) {
        setValues(saved);
        fail(`Weights not saved: ${result.error}`, () => persist(next, message));
        return;
      }
      setSaved(next);
      toast(message);
      router.refresh();
    });
  }

  const keys = Object.keys(DEFAULT_WEIGHTS) as (keyof WeightsConfig)[];
  const isDefault = keys.every((key) => values[key] === DEFAULT_WEIGHTS[key]);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Recommendation weights</SectionLabel>
        <Button
          variant="quiet"
          className="px-2 py-1 text-xs"
          disabled={isDefault}
          onClick={() => persist({ ...DEFAULT_WEIGHTS }, "Weights reset to defaults")}
        >
          Reset to defaults
        </Button>
      </div>
      <p className="text-text-mid mt-2 text-sm">
        The engine never adjusts these itself. Raise a weight to see more of
        that kind of card; the threshold is the score needed to surface at all.
      </p>
      <ul className="mt-3 space-y-2.5">
        {keys.map((key) => (
          <li key={key} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="num text-text-hi text-sm">{key}</p>
              <p className="text-text-low text-xs">{WEIGHT_DESCRIPTIONS[key]}</p>
            </div>
            <NumberField
              aria-label={`Weight ${key}`}
              className="w-20 shrink-0"
              value={values[key]}
              step="0.1"
              min="0"
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value) && value >= 0) {
                  setValues((current) => ({ ...current, [key]: value }));
                }
              }}
              onBlur={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value) && value >= 0 && value !== saved[key]) {
                  persist({ ...values, [key]: value }, "Weights saved");
                }
              }}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
