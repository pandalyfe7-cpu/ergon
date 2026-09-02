export const ONBOARDING_COMPLETE_STEP = 4;

export const INTAKE_RULE_ID = "intake_dimension";
export const INTAKE_RULE_VERSION = "1.0.0";

export const PLAN_RULE_ID = "plan_generate";
export const PLAN_RULE_VERSION = "1.0.0";

export const CONSTRAINT_GATE_RULE_ID = "constraint_gate";
export const CONSTRAINT_GATE_RULE_VERSION = "1.0.0";

/** Stub copy from PRODUCT-SPEC; owner replaces wording later. */
export const ONBOARDING_COPY = {
  goalsTitle: "Name up to three outcomes. Rank them.",
  intakeTitle: "Where I am and where I want to be. Wording TBD.",
  barriersTitle: "What is holding me back. Select barriers from the list.",
  planTitle: "Your plan",
  continue: "Continue to Today",
} as const;

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
