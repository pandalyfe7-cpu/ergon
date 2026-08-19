/**
 * Constraint tag vocabulary. Every library exercise carries one value from
 * each dimension plus zero or more flags; the constraint gate evaluates
 * predicates against them. Stored as text in Postgres so a new value is a
 * data edit; these unions are the write-boundary validation.
 */

export const MOVEMENT_PATTERNS = [
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "knee_dominant",
  "knee_flexion",
  "hip_dominant",
  "chest_isolation",
  "shoulder_isolation",
  "rear_delt",
  "elbow_flexion",
  "elbow_extension",
  "calf",
  "hip_abduction",
] as const;
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

export const LOADING_AXES = ["axial_spinal", "appendicular", "pelvic"] as const;
export type LoadingAxis = (typeof LOADING_AXES)[number];

export const REQUIRED_POSITIONS = [
  "standing",
  "seated",
  "lying",
  "supine",
  "supported",
] as const;
export type RequiredPosition = (typeof REQUIRED_POSITIONS)[number];

export const JOINT_RANGES = ["full", "knee_30_90"] as const;
export type JointRange = (typeof JOINT_RANGES)[number];

export const EXERCISE_FLAGS = ["valsalva_risk", "impact", "deep_knee_flexion"] as const;
export type ExerciseFlag = (typeof EXERCISE_FLAGS)[number];

/** Machine-readable predicate stored in constraint_rules.predicate. */
export type GatePredicate =
  | {
      type: "exclude_tag_combo";
      loading_axis: LoadingAxis;
      required_position: RequiredPosition;
    }
  | {
      type: "require_position";
      movement_pattern: MovementPattern;
      required_position: RequiredPosition;
    }
  | {
      type: "require_range";
      movement_patterns: MovementPattern[];
      joint_range: JointRange;
      exclude_flag: ExerciseFlag;
    }
  | { type: "exclude_flag"; flag: ExerciseFlag };

/** The tag set the gate reads. A projection of the exercises table. */
export type TaggedExercise = {
  slug: string;
  name: string;
  movement_pattern: MovementPattern;
  loading_axis: LoadingAxis;
  required_position: RequiredPosition;
  joint_range: JointRange;
  flags: ExerciseFlag[];
  substitution_slug: string | null;
  is_fixture: boolean;
};
