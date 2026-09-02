import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  CONSTRAINT_GATE_RULE_ID,
  INTAKE_RULE_ID,
  INTAKE_RULE_VERSION,
  PLAN_RULE_ID,
} from "@/lib/onboarding/constants";
import { scoreIntakeDimension } from "@/lib/onboarding/intake";
import {
  applyConstraintGateLast,
  generatePlan,
  generatePlanDraft,
  hasTrainingGoal,
} from "@/lib/onboarding/plan";
import { HABIT_STATES } from "@/lib/types";

describe("intake scoring", () => {
  it("stores provenance on each dimension score", () => {
    const rowId = "11111111-1111-1111-1111-111111111111";
    const scored = scoreIntakeDimension(
      { dimensionKind: "barrier", code: "motivation_drop", currentScore: 72 },
      rowId,
    );

    expect(scored.rule_id).toBe(INTAKE_RULE_ID);
    expect(scored.rule_version).toBe(INTAKE_RULE_VERSION);
    expect(scored.trace[0]?.rule_id).toBe(INTAKE_RULE_ID);
    expect(scored.trace[0]?.rows).toContain(`intake_scores ${rowId}`);
  });
});

describe("plan generation", () => {
  const baseInput = {
    goals: [{ rank: 1, outcome: "Train consistently at the gym" }],
    intakeScores: {
      motivation_drop: 70,
      time_scarcity: 55,
      health_longevity: 80,
    },
    constraints: [] as Array<{
      id: string;
      label: string;
      blocks_patterns: string[];
      active: boolean;
    }>,
  };

  it("detects training goals", () => {
    expect(hasTrainingGoal(baseInput.goals)).toBe(true);
    expect(hasTrainingGoal([{ rank: 1, outcome: "Sleep better" }])).toBe(false);
  });

  it("returns a non-empty plan with four-state habit assignments", () => {
    const plan = generatePlan(baseInput);

    expect(plan.habits.length).toBeGreaterThan(0);
    expect(plan.metrics.length).toBeGreaterThan(0);
    expect(plan.training).not.toBeNull();
    expect(plan.rule_id).toBe(PLAN_RULE_ID);

    for (const habit of plan.habits) {
      expect(HABIT_STATES).toContain(habit.state);
    }
  });

  it("runs the constraint gate last and does not re-add gated training", () => {
    const constrained = {
      ...baseInput,
      constraints: [
        {
          id: "constraint-1",
          label: "No impact loading",
          blocks_patterns: ["impact"],
          active: true,
        },
      ],
    };

    const draft = generatePlanDraft(constrained);
    expect(draft.training).not.toBeNull();
    expect(draft.habits.some((habit) => habit.slug === "training-adherence")).toBe(true);

    const gated = applyConstraintGateLast(draft, constrained.constraints);
    expect(gated.training).toBeNull();
    expect(gated.habits.some((habit) => habit.slug === "training-adherence")).toBe(false);
    expect(gated.metrics.some((metric) => metric.slug === "training-days")).toBe(false);

    const finalPlan = generatePlan(constrained);
    expect(finalPlan.training).toBeNull();
    expect(finalPlan.trace.some((entry) => entry.rule_id === CONSTRAINT_GATE_RULE_ID)).toBe(true);
    expect(
      finalPlan.trace.findIndex((entry) => entry.rule_id === CONSTRAINT_GATE_RULE_ID),
    ).toBeGreaterThan(
      finalPlan.trace.findIndex((entry) => entry.rule_id === PLAN_RULE_ID),
    );
  });
});

describe("ensureSeeded path", () => {
  it("does not seed seed/constraints.json to new users", () => {
    const source = readFileSync("src/lib/ergos/seed.ts", "utf8");
    expect(source).not.toMatch(/import\s+constraintsSeed\s+from\s+["'].*constraints\.json["']/);
    expect(source).not.toContain('.from("constraint_rules")');
  });
});
