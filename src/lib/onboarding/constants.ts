export const ONBOARDING_COMPLETE_STEP = 4;

export const INTAKE_RULE_ID = "intake_dimension";
export const INTAKE_RULE_VERSION = "1.0.0";

export const PLAN_RULE_ID = "plan_generate";
export const PLAN_RULE_VERSION = "1.0.0";

export const CONSTRAINT_GATE_RULE_ID = "constraint_gate";
export const CONSTRAINT_GATE_RULE_VERSION = "1.0.0";

/** Intake dimensions shown in onboarding (subset for MVP flow). */
export const ONBOARDING_BARRIERS = [
  "time_scarcity",
  "motivation_drop",
  "energy_crash",
  "injury_fear",
] as const;

export const ONBOARDING_MOTIVATORS = [
  "health_longevity",
  "mastery",
  "capability_restoration",
] as const;

export const ONBOARDING_COPY = {
  goalsTitle: "Name up to three outcomes. Rank them.",
  intakeTitle: "How are things right now?",
  intakeSubtitle:
    "Rate each item for the past week. These scores set the starting intensity of your plan.",
  barrierScaleHint: "0 = not an issue · 100 = a major issue",
  motivatorScaleHint: "0 = barely motivates me · 100 = a primary driver",
  planTitle: "Your plan",
  continue: "Continue to Today",
} as const;

export const INTAKE_BARRIER_QUESTIONS: Record<
  (typeof ONBOARDING_BARRIERS)[number],
  string
> = {
  time_scarcity: "How much is lack of time getting in the way?",
  motivation_drop: "How often does motivation drop off?",
  energy_crash: "How often do energy crashes derail you?",
  injury_fear: "How much does fear of injury or flare hold you back?",
};

export const INTAKE_MOTIVATOR_QUESTIONS: Record<
  (typeof ONBOARDING_MOTIVATORS)[number],
  string
> = {
  health_longevity: "How much does health and longevity drive you?",
  mastery: "How much does mastery and skill drive you?",
  capability_restoration: "How much does getting capability back drive you?",
};
