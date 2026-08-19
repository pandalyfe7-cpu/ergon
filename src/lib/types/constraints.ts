/**
 * The constraint system.
 *
 * Constraints attach to an Exercise record once and travel with it everywhere.
 * Each constraint stores its type and its parameters together, so changing a
 * limit later is an edit to a row, never a rename across the codebase.
 */

export const CONSTRAINT_TYPES = [
  "SEATED",
  "ROM_LIMIT",
  "NO_AXIAL",
  "LOAD_CEILING",
  "NO_VALSALVA",
] as const;

export type ConstraintType = (typeof CONSTRAINT_TYPES)[number];

interface ConstraintBase {
  /** Free text for anything the five types cannot express. Not shown in the badge. */
  note?: string | null;
}

/** Overhead work must be performed seated. */
export interface SeatedConstraint extends ConstraintBase {
  type: "SEATED";
}

/** Joint range of motion is restricted to a degree range. */
export interface RomLimitConstraint extends ConstraintBase {
  type: "ROM_LIMIT";
  min_degrees: number;
  max_degrees: number;
}

/** No standing axial load through the spine. */
export interface NoAxialConstraint extends ConstraintBase {
  type: "NO_AXIAL";
}

/** Hard weight cap. Nothing may recommend or accept a load above this. */
export interface LoadCeilingConstraint extends ConstraintBase {
  type: "LOAD_CEILING";
  max_load_lb: number;
}

/** No heavy breath holding. */
export interface NoValsalvaConstraint extends ConstraintBase {
  type: "NO_VALSALVA";
}

export type ExerciseConstraint =
  | SeatedConstraint
  | RomLimitConstraint
  | NoAxialConstraint
  | LoadCeilingConstraint
  | NoValsalvaConstraint;

/** Current knee flexion limits. A change here is the only edit required. */
export const DEFAULT_ROM_LIMIT = {
  min_degrees: 30,
  max_degrees: 90,
} as const;

function trim(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

/**
 * The badge string shown wherever an exercise appears. Parameterized
 * constraints show their numbers: "ROM 30-90", "CAP 135 LB".
 */
export function formatConstraintBadge(constraint: ExerciseConstraint): string {
  switch (constraint.type) {
    case "SEATED":
      return "SEATED";
    case "ROM_LIMIT":
      return `ROM ${trim(constraint.min_degrees)}-${trim(constraint.max_degrees)}`;
    case "NO_AXIAL":
      return "NO AXIAL";
    case "LOAD_CEILING":
      return `CAP ${trim(constraint.max_load_lb)} LB`;
    case "NO_VALSALVA":
      return "NO VALSALVA";
    default: {
      const exhaustive: never = constraint;
      return exhaustive;
    }
  }
}

/**
 * The hard weight cap for an exercise, or null if uncapped. Anything that
 * produces a load number reads it from here rather than scanning constraints.
 */
export function getLoadCeilingLb(constraints: ExerciseConstraint[]): number | null {
  const ceiling = constraints.find(
    (c): c is LoadCeilingConstraint => c.type === "LOAD_CEILING",
  );
  return ceiling ? ceiling.max_load_lb : null;
}
