/**
 * Fixed vocabularies shared by every screen. Adding a member here is a data
 * model change; renaming one breaks stored rows.
 */

/**
 * Canonical muscle groups. These strings are the keys of
 * Exercise.stimulus_weights and the region ids the body-tab figures fill, so
 * the SVG regions must be named from this list exactly.
 *
 * Not a Postgres enum: the values live inside a jsonb object, which Postgres
 * cannot key-check. This array is the only source of truth.
 */
export const MUSCLE_GROUPS = [
  "chest",
  "front_delts",
  "side_delts",
  "rear_delts",
  "biceps",
  "triceps",
  "forearms",
  "traps",
  "lats",
  "upper_back",
  "lower_back",
  "abs",
  "obliques",
  "glutes",
  "quads",
  "hamstrings",
  "adductors",
  "abductors",
  "calves",
  "neck",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/**
 * How much one set of an exercise contributes to each muscle it trains.
 * A direct prime mover is 1.0, a meaningful secondary is around 0.5. Absent
 * keys mean zero. Three sets of bench press with
 * `{ chest: 1, front_delts: 0.5, triceps: 0.5 }` contribute 3.0 / 1.5 / 1.5.
 */
export type StimulusWeights = Partial<Record<MuscleGroup, number>>;

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number];

/**
 * Which progression rule produced a recommendation. Stored as text in
 * coach_decisions.rule so a later prompt can add a rule without a migration;
 * this list is what the app writes today. getAimFor in
 * src/lib/training/aim.ts is where each one fires.
 */
export const PROGRESSION_RULES = [
  /** No RPE on last session's working sets. Weight and reps held. */
  "hold_no_rpe",
  /** Average RPE 9.5 or higher. Weight and reps held, rest flagged. */
  "hold_rest",
  /** Top of the rep range at RPE 8 or under. Plus 5 lb. */
  "add_load",
  /** Average RPE 7 or under, below the top of the range. More reps. */
  "add_reps",
  /** A load increase was earned but the exercise's LOAD_CEILING blocks it. */
  "hold_ceiling",
  /** Average RPE between 8 and 9.5. Repeat the session. */
  "hold",
  /** A load increase was earned but the 10% progression cap blocks it. */
  "load_cap",
] as const;

export type ProgressionRule = (typeof PROGRESSION_RULES)[number];

/** Four-state growth model. Hold and Recover are progress, never failure. */
export const HABIT_STATES = ["build", "hold", "recover", "dormant"] as const;
export type HabitState = (typeof HABIT_STATES)[number];

/** Fixed dismissal reasons; the feedback loop never takes free text. */
export const DISMISS_REASONS = [
  "not_today",
  "already_done",
  "too_long",
  "not_useful",
  "feeling_unwell",
] as const;
export type DismissReason = (typeof DISMISS_REASONS)[number];

export const DISMISS_REASON_LABELS: Record<DismissReason, string> = {
  not_today: "Not today",
  already_done: "Already done",
  too_long: "Takes too long",
  not_useful: "Not useful",
  feeling_unwell: "Feeling unwell",
};

export const RECOMMENDATION_KINDS = [
  "session",
  "habit",
  "recovery",
  "rest",
  "metric",
] as const;
export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number];

export const RECOMMENDATION_STATUSES = [
  "active",
  "accepted",
  "dismissed",
  "snoozed",
  "expired",
] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];
