/**
 * Entity types. Field names match Postgres column names exactly, so these are
 * the row shapes coming back from Supabase with no mapping layer.
 *
 * Unit convention: any field carrying a unit names it. Loads and bodyweight are
 * `_lb`, macros are `_g`, water is `_ml`. Nothing is stored in two units.
 *
 * These are type aliases rather than interfaces on purpose: Supabase's generated
 * client requires row types to carry an implicit index signature, which
 * interfaces do not have.
 */

import type { ExerciseConstraint } from "./constraints";
import type {
  BarrierCode,
  DismissReason,
  HabitState,
  MealSlot,
  MotivatorCode,
  ProgressionRule,
  RecommendationKind,
  RecommendationStatus,
  StimulusWeights,
} from "./enums";
import type {
  ExerciseFlag,
  GatePredicate,
  JointRange,
  LoadingAxis,
  MovementPattern,
  RequiredPosition,
} from "./tags";

export type UUID = string;
/** ISO 8601 timestamp with timezone, as returned by Postgres `timestamptz`. */
export type Timestamp = string;

/** Present on every table. Defaulted by Postgres to `auth.uid()` on insert. */
type Owned = {
  id: UUID;
  user_id: UUID;
};

export type Exercise = Owned & {
  name: string;
  stimulus_weights: StimulusWeights;
  constraints: ExerciseConstraint[];
  created_at: Timestamp;
  /** Seeded library entries carry a slug; user-created rows may not. */
  slug: string | null;
  equipment: string | null;
  movement_pattern: MovementPattern | null;
  loading_axis: LoadingAxis | null;
  required_position: RequiredPosition | null;
  joint_range: JointRange | null;
  flags: ExerciseFlag[];
  substitution_slug: string | null;
  /** Contraindicated gate-test fixture; never recommendable. */
  is_fixture: boolean;
  seed_version: string | null;
};

/** One row of a routine. Array order is display and execution order. */
export type TemplateExercise = {
  exercise_id: UUID;
  prescribed_sets: number;
  rep_min: number;
  rep_max: number;
};

export type ExerciseTemplate = Owned & {
  name: string;
  exercises: TemplateExercise[];
  created_at: Timestamp;
  /** 0 = Push A ... 5 = Legs B for the six rotation sessions; null otherwise. */
  rotation_index: number | null;
  seed_version: string | null;
};

/** A training session. Open while `ended_at` is null. */
export type Session = Owned & {
  template_id: UUID | null;
  started_at: Timestamp;
  ended_at: Timestamp | null;
  created_at: Timestamp;
};

export type LoggedSet = Owned & {
  session_id: UUID;
  exercise_id: UUID;
  weight_lb: number;
  reps: number;
  /** 1 to 10 in half steps, null when not recorded. */
  rpe: number | null;
  /** Warm-up sets are excluded from volume, stimulus, PRs, and progression. */
  is_warmup: boolean;
  /** Order within the session's sets for this exercise, starting at 1. */
  set_order: number;
  performed_at: Timestamp;
};

/** Sessions carry their sets. Read this shape wherever a session's work matters. */
export type SessionWithSets = Session & { logged_sets: LoggedSet[] };

/**
 * One recommendation the coach tab made and I acted on, plus what I went on to
 * lift against it. Write-only: nothing in the app reads this table, it exists
 * so progression can later be tuned against real outcomes.
 *
 * `session_id` and the `performed_*` fields stay null until a session logs a
 * working set for the exercise; the first one to do so claims the row.
 */
export type CoachDecision = Owned & {
  exercise_id: UUID;
  recommended_weight_lb: number;
  recommended_rep_min: number;
  recommended_rep_max: number;
  /** Shown on the card, under 12 words. */
  reason: string;
  rule: ProgressionRule;
  /** False when I edited the numbers before training. */
  accepted: boolean;
  override_weight_lb: number | null;
  override_rep_min: number | null;
  override_rep_max: number | null;
  session_id: UUID | null;
  /** Heaviest working set of the claiming session, and its reps. */
  performed_weight_lb: number | null;
  performed_reps: number | null;
  performed_sets: number | null;
  performed_at: Timestamp | null;
  /** When the recommendation was decided on. */
  created_at: Timestamp;
};

/** Macros are stored per one serving. `serving_unit` labels what one serving is. */
export type Food = Owned & {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** Servings pre-filled when logging this food, usually 1. */
  default_serving: number;
  /** Human label for a single serving, e.g. "cup", "slice", "100 g". */
  serving_unit: string;
  is_saved: boolean;
  created_at: Timestamp;
};

export type LoggedMeal = Owned & {
  food_id: UUID;
  meal_slot: MealSlot;
  /** Number of servings eaten. Macros are the food's values times this. */
  serving: number;
  eaten_at: Timestamp;
  created_at: Timestamp;
};

/** Exactly one row. Not dated; the current target applies to every day. */
export type DailyMacroTarget = Owned & {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

/** `quantity` is a number of servings of the referenced food. */
export type RecipeIngredient = {
  food_id: UUID;
  quantity: number;
};

/** Totals are computed from `ingredients` on read, never stored. */
export type Recipe = Owned & {
  name: string;
  ingredients: RecipeIngredient[];
  created_at: Timestamp;
};

export type WaterLog = Owned & {
  amount_ml: number;
  logged_at: Timestamp;
};

export type BodyweightLog = Owned & {
  weight_lb: number;
  logged_at: Timestamp;
};

/**
 * Intake profile. Keyed by user_id (no separate id). Missing row means
 * onboarding has not started; that is unknown, not step 0.
 */
export type UserProfile = {
  user_id: UUID;
  age_band: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  training_years: number | null;
  baseline_weekly_days: number | null;
  capacity: Record<string, unknown>;
  onboarding_step: number;
  onboarding_completed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type UserConstraint = Owned & {
  kind: "injury" | "surgery" | "hardware" | "joint" | "systemic" | "cognitive" | "other";
  label: string;
  body_region: string | null;
  laterality: "left" | "right" | "bilateral" | "n/a" | null;
  severity: "mild" | "moderate" | "severe" | null;
  blocks_patterns: string[];
  load_cap_pct: number | null;
  rom_notes: string | null;
  active: boolean;
  created_at: Timestamp;
};

export type UserGoal = Owned & {
  rank: number;
  outcome: string;
  target_date: string | null;
  metric: string | null;
  created_at: Timestamp;
};

export type UserBarrier = Owned & {
  code: BarrierCode;
  note: string | null;
  created_at: Timestamp;
};

export type UserMotivator = Owned & {
  code: MotivatorCode;
  note: string | null;
  created_at: Timestamp;
};

/** Exactly one row. */
export type UserSettings = Owned & {
  weekly_session_target: number;
  daily_water_target_ml: number;
  /** Amount a single tap of the water control adds. */
  water_increment_ml: number;
  /** Fallback when the morning entry does not set time available. */
  default_time_available_min: number;
};

/** Points at the next of the six rotation sessions. Exactly one row. */
export type RotationState = Owned & {
  position: number;
  updated_at: Timestamp;
};

/** One row of the constraint table. The gate consumes `predicate`. */
export type ConstraintRuleRow = Owned & {
  rule_id: string;
  description: string;
  predicate: GatePredicate;
  active: boolean;
  seed_version: string | null;
  created_at: Timestamp;
};

/** Per-habit mechanism configuration (auto-mark source, bedtime window). */
export type HabitConfig = {
  auto?:
    | "session_finished"
    | "protein_floor_met"
    | "bed_time_within_window"
    | "morning_entry_saved";
  target_bed_time?: string;
  window_min?: number;
};

export type Habit = Owned & {
  slug: string;
  name: string;
  state: HabitState;
  state_changed_at: Timestamp;
  decay_window_days: number;
  advance_rule: string;
  floor_action: string;
  state_meanings: Record<HabitState, string>;
  config: HabitConfig;
  sort_order: number;
  seed_version: string | null;
  created_at: Timestamp;
};

export type HabitEvent = Owned & {
  habit_id: UUID;
  event_type: "completed" | "floor" | "state_change" | "resumed";
  /** Local calendar date the mark applies to, YYYY-MM-DD. */
  event_date: string;
  from_state: HabitState | null;
  to_state: HabitState | null;
  note: string | null;
  created_at: Timestamp;
};

export type MetricTarget =
  | { type: "static"; floor: number; ceiling: number }
  | {
      type: "derived_protein";
      g_per_lb: number;
      ceiling_offset: number;
      floor: number;
      ceiling: number;
      /** 7-day average bodyweight the current floor/ceiling derive from. */
      source_weight_lb: number | null;
      computed_at: Timestamp | null;
    };

export type MetricDefinition = Owned & {
  slug: string;
  name: string;
  unit: string;
  direction: "up" | "down" | "into_band";
  target: MetricTarget;
  sort_order: number;
  seed_version: string | null;
  created_at: Timestamp;
};

export type MorningEntry = Owned & {
  /** Local calendar date, YYYY-MM-DD. One per day. */
  entry_date: string;
  sleep_hours: number;
  /** 1-10 subjective; doubles as the readiness metric. */
  sleep_quality: number;
  /** "HH:MM:SS" from Postgres `time`, null when not recorded. */
  bed_time: string | null;
  time_available_min: number | null;
  created_at: Timestamp;
};

/** One trace line: which rule fired and which rows it read. */
export type TraceEntry = {
  rule_id: string;
  detail: string;
  rows: string[];
};

export type Recommendation = Owned & {
  /** Local day this was generated for. */
  rec_date: string;
  /** 0 primary, 1-3 secondary. */
  slot: number;
  action_kind: RecommendationKind;
  action_ref: string;
  title: string;
  reason: string;
  est_minutes: number;
  /** Which metric or habit this moves (slug), null for rest. */
  moves: string | null;
  score: number;
  rule_ids: string[];
  trace: TraceEntry[];
  engine_version: string;
  seed_versions: Record<string, string>;
  status: RecommendationStatus;
  status_at: Timestamp | null;
  dismiss_reason: DismissReason | null;
  snoozed_until: Timestamp | null;
  created_at: Timestamp;
};

/** Owner-edited scoring weights; defaults live in src/lib/engine/weights.ts. */
export type EngineWeightsRow = Owned & {
  weights: Record<string, number>;
  updated_at: Timestamp;
};
