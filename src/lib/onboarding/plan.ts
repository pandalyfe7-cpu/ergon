import {
  CONSTRAINT_GATE_RULE_ID,
  CONSTRAINT_GATE_RULE_VERSION,
  PLAN_RULE_ID,
  PLAN_RULE_VERSION,
} from "@/lib/onboarding/constants";
import type { HabitState, TraceEntry } from "@/lib/types";

export type PlanHabit = {
  slug: string;
  state: HabitState;
  frequencyPerWeek: number;
};

export type PlanMetric = {
  slug: string;
};

export type PlanTraining = {
  templateKey: "ppl-6" | "upper-lower-4";
} | null;

export type PlanDraft = {
  habits: PlanHabit[];
  metrics: PlanMetric[];
  training: PlanTraining;
  rule_id: string;
  rule_version: string;
  trace: TraceEntry[];
};

export type UserConstraintInput = {
  id: string;
  label: string;
  blocks_patterns: string[];
  active: boolean;
};

export type PlanInput = {
  goals: { rank: number; outcome: string }[];
  intakeScores: Record<string, number>;
  constraints: UserConstraintInput[];
};

const TRAINING_GOAL_PATTERN = /\b(train|workout|strength|gym|lift)\b/i;

/** Training template is offered when a goal outcome mentions training. */
export function hasTrainingGoal(goals: PlanInput["goals"]): boolean {
  return goals.some((goal) => TRAINING_GOAL_PATTERN.test(goal.outcome));
}

function habitStateFromStruggle(score: number): HabitState {
  if (score >= 60) return "recover";
  if (score >= 40) return "hold";
  return "build";
}

/** Builds the plan before the constraint gate runs. */
export function generatePlanDraft(input: PlanInput): PlanDraft {
  const habits: PlanHabit[] = [
    { slug: "morning-entry", state: "build", frequencyPerWeek: 7 },
  ];
  const metrics: PlanMetric[] = [
    { slug: "sleep-duration" },
    { slug: "readiness" },
    { slug: "protein" },
  ];
  let training: PlanTraining = null;

  const motivation = input.intakeScores.motivation_drop ?? 50;
  const timeScarcity = input.intakeScores.time_scarcity ?? 50;

  habits.push({
    slug: "sleep-timing",
    state: habitStateFromStruggle(timeScarcity),
    frequencyPerWeek: 5,
  });

  if (hasTrainingGoal(input.goals)) {
    habits.push({
      slug: "training-adherence",
      state: habitStateFromStruggle(motivation),
      frequencyPerWeek: 4,
    });
    metrics.push({ slug: "training-days" });
    training = { templateKey: "ppl-6" };
  }

  return {
    habits,
    metrics,
    training,
    rule_id: PLAN_RULE_ID,
    rule_version: PLAN_RULE_VERSION,
    trace: [
      {
        rule_id: PLAN_RULE_ID,
        detail: `goals=${input.goals.length} training=${training !== null}`,
        rows: input.goals.map((g) => `user_goals rank-${g.rank}`),
      },
    ],
  };
}

/**
 * Final filter on the plan. May remove training when constraints block impact
 * loading. Never adds items.
 */
export function applyConstraintGateLast(
  draft: PlanDraft,
  constraints: UserConstraintInput[],
): PlanDraft {
  const blocked = new Set<string>();
  const active = constraints.filter((row) => row.active);
  for (const row of active) {
    for (const pattern of row.blocks_patterns) blocked.add(pattern);
  }

  let training = draft.training;
  const gateTrace: TraceEntry[] = [];

  if (training && blocked.has("impact")) {
    gateTrace.push({
      rule_id: CONSTRAINT_GATE_RULE_ID,
      detail: "training removed; active constraint blocks impact loading",
      rows: active
        .filter((row) => row.blocks_patterns.includes("impact"))
        .map((row) => `user_constraints ${row.id}`),
    });
    training = null;
  }

  const habits = draft.habits.filter((habit) => {
    if (habit.slug === "training-adherence" && !training) return false;
    return true;
  });

  const metrics = draft.metrics.filter((metric) => {
    if (metric.slug === "training-days" && !training) return false;
    return true;
  });

  return {
    habits,
    metrics,
    training,
    rule_id: draft.rule_id,
    rule_version: draft.rule_version,
    trace: [...draft.trace, ...gateTrace],
  };
}

/** Constraint gate is always the last step. */
export function generatePlan(input: PlanInput): PlanDraft {
  return applyConstraintGateLast(generatePlanDraft(input), input.constraints);
}
