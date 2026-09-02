/**
 * The Supabase schema type, derived from the entity types so the two can never
 * drift. Pass it to the client (`createClient()` in src/lib/supabase/*) and
 * every table name, column name, and row shape is checked at compile time.
 *
 * Table names here are the literal Postgres table names.
 */

import type {
  BodyweightLog,
  CoachDecision,
  ConstraintRuleRow,
  DailyMacroTarget,
  EngineWeightsRow,
  Exercise,
  ExerciseTemplate,
  Food,
  Habit,
  HabitEvent,
  LoggedMeal,
  LoggedSet,
  MetricDefinition,
  MorningEntry,
  Recipe,
  Recommendation,
  RotationState,
  Session,
  UserBarrier,
  UserConstraint,
  UserGoal,
  UserMotivator,
  IntakeScore,
  MetricLog,
  UserProfile,
  UserSettings,
  WaterLog,
} from "./entities";
import type { MealSlot } from "./enums";

/** Columns Postgres always fills in: `id`, `user_id` (auth.uid()), `created_at`. */
type AlwaysDefaulted = "id" | "user_id" | "created_at";

/** Flattens intersections into a plain object type; Supabase's overloads need it. */
type Simplify<T> = { [K in keyof T]: T[K] };

type Table<Row, AlsoDefaulted extends keyof Row = never> = {
  Row: Row;
  Insert: Simplify<
    Omit<Row, Extract<AlwaysDefaulted, keyof Row> | AlsoDefaulted> &
      Partial<Pick<Row, Extract<AlwaysDefaulted, keyof Row> | AlsoDefaulted>>
  >;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      exercises: Table<
        Exercise,
        | "stimulus_weights"
        | "constraints"
        | "slug"
        | "equipment"
        | "movement_pattern"
        | "loading_axis"
        | "required_position"
        | "joint_range"
        | "flags"
        | "substitution_slug"
        | "is_fixture"
        | "seed_version"
      >;
      exercise_templates: Table<
        ExerciseTemplate,
        "exercises" | "rotation_index" | "seed_version"
      >;
      sessions: Table<Session, "template_id" | "started_at" | "ended_at">;
      logged_sets: Table<LoggedSet, "rpe" | "is_warmup" | "performed_at">;
      coach_decisions: Table<
        CoachDecision,
        | "override_weight_lb"
        | "override_rep_min"
        | "override_rep_max"
        | "session_id"
        | "performed_weight_lb"
        | "performed_reps"
        | "performed_sets"
        | "performed_at"
      >;
      foods: Table<Food, "default_serving" | "serving_unit" | "is_saved">;
      logged_meals: Table<LoggedMeal, "eaten_at">;
      daily_macro_targets: Table<DailyMacroTarget>;
      recipes: Table<Recipe, "ingredients">;
      water_logs: Table<WaterLog, "logged_at">;
      bodyweight_logs: Table<BodyweightLog, "logged_at">;
      user_settings: Table<
        UserSettings,
        | "weekly_session_target"
        | "daily_water_target_ml"
        | "water_increment_ml"
        | "default_time_available_min"
      >;
      rotation_state: Table<RotationState, "position" | "updated_at">;
      constraint_rules: Table<ConstraintRuleRow, "active" | "seed_version">;
      habits: Table<
        Habit,
        | "state"
        | "state_changed_at"
        | "state_meanings"
        | "config"
        | "sort_order"
        | "seed_version"
      >;
      habit_events: Table<HabitEvent, "from_state" | "to_state" | "note" | "rule_id" | "rule_version" | "trace">;
      metric_definitions: Table<MetricDefinition, "sort_order" | "seed_version">;
      morning_entries: Table<MorningEntry, "bed_time" | "time_available_min">;
      recommendations: Table<
        Recommendation,
        | "action_ref"
        | "moves"
        | "trace"
        | "seed_versions"
        | "status"
        | "status_at"
        | "dismiss_reason"
        | "snoozed_until"
      >;
      engine_weights: Table<EngineWeightsRow, "updated_at">;
      user_profile: Table<UserProfile, "capacity" | "onboarding_step" | "updated_at">;
      user_constraints: Table<
        UserConstraint,
        "blocks_patterns" | "active" | "body_region" | "laterality" | "severity" | "load_cap_pct" | "rom_notes"
      >;
      user_goals: Table<UserGoal, "target_date" | "metric">;
      user_barriers: Table<UserBarrier, "note">;
      user_motivators: Table<UserMotivator, "note">;
      intake_scores: Table<IntakeScore, "trace">;
      metric_logs: Table<MetricLog, "trace">;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      meal_slot: MealSlot;
    };
    CompositeTypes: Record<never, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TableInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TableUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
