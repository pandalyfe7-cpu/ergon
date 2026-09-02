"use client";

import { useState, useTransition } from "react";

import { Button, Card, NumberField, SectionLabel, TextField } from "@/components/ui";
import {
  ONBOARDING_BARRIERS,
  ONBOARDING_COPY,
  ONBOARDING_MOTIVATORS,
} from "@/lib/onboarding/constants";
import {
  completeOnboarding,
  saveGoals,
  saveIntake,
  type GoalInput,
} from "@/lib/onboarding/actions";
import type { BarrierCode, MotivatorCode } from "@/lib/types";

type PlanSummary = {
  habits: Array<{ slug: string; state: string; frequencyPerWeek: number }>;
  metrics: Array<{ slug: string }>;
  training: { templateKey: string } | null;
};

type Props = {
  step: number;
  goals: Array<{ rank: number; outcome: string }>;
  plan: PlanSummary | null;
};

function formatCode(code: string): string {
  return code.replaceAll("_", " ");
}

export function OnboardingFlow({ step, goals: initialGoals, plan }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [goalFields, setGoalFields] = useState<[string, string, string]>(() => {
    const sorted = [...initialGoals].sort((a, b) => a.rank - b.rank);
    return [sorted[0]?.outcome ?? "", sorted[1]?.outcome ?? "", sorted[2]?.outcome ?? ""];
  });

  const [barrierScores, setBarrierScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(ONBOARDING_BARRIERS.map((code) => [code, 50])),
  );
  const [motivatorScores, setMotivatorScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(ONBOARDING_MOTIVATORS.map((code) => [code, 50])),
  );

  function run(action: () => Promise<{ error: string } | { ok: true } | void>) {
    setError(null);
    start(async () => {
      const result = await action();
      if (result && "error" in result) setError(result.error);
    });
  }

  if (step >= 3 && plan) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-text-hi text-xl font-semibold">{ONBOARDING_COPY.planTitle}</h1>
          <p className="text-text-mid mt-2 text-sm">
            Habits, metrics, and training template chosen from your goals and intake.
          </p>
        </div>
        <div data-testid="onboarding-plan">
          <Card>
          <SectionLabel>Habits</SectionLabel>
          <ul className="mt-3 space-y-2">
            {plan.habits.map((habit) => (
              <li key={habit.slug} className="text-text-hi text-sm">
                {formatCode(habit.slug)} · {habit.state} · {habit.frequencyPerWeek}×/week
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <SectionLabel>Metrics</SectionLabel>
          </div>
          <ul className="mt-3 space-y-2">
            {plan.metrics.map((metric) => (
              <li key={metric.slug} className="text-text-hi text-sm">
                {formatCode(metric.slug)}
              </li>
            ))}
          </ul>
          {plan.training && (
            <>
            <div className="mt-6">
              <SectionLabel>Training</SectionLabel>
            </div>
              <p className="text-text-hi mt-2 text-sm">{plan.training.templateKey}</p>
            </>
          )}
        </Card>
        </div>
        {error && <p className="text-negative text-sm">{error}</p>}
        <Button
          variant="primary"
          disabled={pending}
          onClick={() => run(() => completeOnboarding())}
        >
          {ONBOARDING_COPY.continue}
        </Button>
      </div>
    );
  }

  if (step >= 1) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-text-hi text-xl font-semibold">{ONBOARDING_COPY.intakeTitle}</h1>
          <p className="text-text-mid mt-2 text-sm">{ONBOARDING_COPY.barriersTitle}</p>
        </div>
        <Card>
          <SectionLabel>Barriers</SectionLabel>
          <ul className="mt-3 space-y-4">
            {ONBOARDING_BARRIERS.map((code) => (
              <li key={code}>
                <label className="text-text-hi text-sm">{formatCode(code)}</label>
                <NumberField
                  className="mt-1"
                  min={0}
                  max={100}
                  value={barrierScores[code] ?? 50}
                  onChange={(event) =>
                    setBarrierScores((prev) => ({
                      ...prev,
                      [code]: Number(event.target.value),
                    }))
                  }
                />
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <SectionLabel>Motivators</SectionLabel>
          </div>
          <ul className="mt-3 space-y-4">
            {ONBOARDING_MOTIVATORS.map((code) => (
              <li key={code}>
                <label className="text-text-hi text-sm">{formatCode(code)}</label>
                <NumberField
                  className="mt-1"
                  min={0}
                  max={100}
                  value={motivatorScores[code] ?? 50}
                  onChange={(event) =>
                    setMotivatorScores((prev) => ({
                      ...prev,
                      [code]: Number(event.target.value),
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
        {error && <p className="text-negative text-sm">{error}</p>}
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            run(() =>
              saveIntake({
                barriers: ONBOARDING_BARRIERS.map((code) => ({
                  code: code as BarrierCode,
                  score: barrierScores[code] ?? 50,
                })),
                motivators: ONBOARDING_MOTIVATORS.map((code) => ({
                  code: code as MotivatorCode,
                  score: motivatorScores[code] ?? 50,
                })),
              }),
            )
          }
        >
          Build my plan
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-text-hi text-xl font-semibold">{ONBOARDING_COPY.goalsTitle}</h1>
      </div>
      <Card>
        {[0, 1, 2].map((index) => (
          <div key={index} className={index > 0 ? "mt-4" : undefined}>
            <label
              htmlFor={`goal-${index + 1}`}
              className="text-text-mid text-xs font-medium tracking-[0.06em] uppercase"
            >
              Goal {index + 1}
            </label>
            <TextField
              id={`goal-${index + 1}`}
              className="mt-1"
              value={goalFields[index]}
              onChange={(event) => {
                const next = [...goalFields] as [string, string, string];
                next[index] = event.target.value;
                setGoalFields(next);
              }}
              placeholder={index === 0 ? "Required" : "Optional"}
            />
          </div>
        ))}
      </Card>
      {error && <p className="text-negative text-sm">{error}</p>}
      <Button
        variant="primary"
        disabled={pending}
        onClick={() => {
          const goals: GoalInput[] = goalFields
            .map((outcome, index) => ({ outcome, rank: index + 1 }))
            .filter((goal) => goal.outcome.trim().length > 0);
          run(() => saveGoals(goals));
        }}
      >
        Continue
      </Button>
    </div>
  );
}
