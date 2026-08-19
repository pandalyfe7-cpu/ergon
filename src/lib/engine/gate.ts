/**
 * The constraint gate. Pure, deterministic, and the FINAL filter on every
 * candidate recommendation: nothing runs after it, and nothing may surface a
 * movement whose tags conflict with the constraint table (hard invariant).
 *
 * Evaluation:
 *   - fixtures (is_fixture) are always excluded, before any rule runs;
 *   - each active rule's predicate is checked against the exercise's tags;
 *   - a violating exercise is replaced by its tagged substitution when that
 *     substitution itself passes every rule, otherwise it is dropped;
 *   - every exclusion and substitution is recorded so the trace can show it.
 */

import type { ConstraintRuleRow, GatePredicate, TaggedExercise, TraceEntry } from "@/lib/types";

export type GateViolation = {
  rule_id: string;
  description: string;
};

/** Why one predicate rejects one exercise, or null when it passes. */
function violates(exercise: TaggedExercise, predicate: GatePredicate): boolean {
  switch (predicate.type) {
    case "exclude_tag_combo":
      return (
        exercise.loading_axis === predicate.loading_axis &&
        exercise.required_position === predicate.required_position
      );
    case "require_position":
      return (
        exercise.movement_pattern === predicate.movement_pattern &&
        exercise.required_position !== predicate.required_position
      );
    case "require_range":
      if (exercise.flags.includes(predicate.exclude_flag)) return true;
      return (
        predicate.movement_patterns.includes(exercise.movement_pattern) &&
        exercise.joint_range !== predicate.joint_range
      );
    case "exclude_flag":
      return exercise.flags.includes(predicate.flag);
  }
}

/** All rule violations for one exercise. Empty means the exercise passes. */
export function evaluateExercise(
  exercise: TaggedExercise,
  rules: ConstraintRuleRow[],
): GateViolation[] {
  const active = rules.filter((rule) => rule.active);
  const found: GateViolation[] = [];
  for (const rule of active) {
    if (violates(exercise, rule.predicate)) {
      found.push({ rule_id: rule.rule_id, description: rule.description });
    }
  }
  return found;
}

export type GatedExercise = {
  exercise: TaggedExercise;
  /** Set when this entry replaced a blocked movement. */
  substituted_for: string | null;
};

export type GateOutcome = {
  allowed: GatedExercise[];
  /** One trace entry per exclusion or substitution, for the UI. */
  trace: TraceEntry[];
};

/**
 * Filters a list of movements through the constraint table. Blocked movements
 * are substituted when their tagged alternative passes, otherwise dropped.
 */
export function gateExercises(
  exercises: TaggedExercise[],
  rules: ConstraintRuleRow[],
  library: Map<string, TaggedExercise>,
): GateOutcome {
  const allowed: GatedExercise[] = [];
  const trace: TraceEntry[] = [];

  for (const exercise of exercises) {
    if (exercise.is_fixture) {
      trace.push({
        rule_id: "gate",
        detail: `${exercise.name} is a contraindicated fixture; never surfaced`,
        rows: [`exercises ${exercise.slug}`],
      });
      continue;
    }

    const violations = evaluateExercise(exercise, rules);
    if (violations.length === 0) {
      allowed.push({ exercise, substituted_for: null });
      continue;
    }

    const ruleList = violations.map((v) => v.rule_id).join(", ");
    const substitution = exercise.substitution_slug
      ? library.get(exercise.substitution_slug)
      : undefined;

    if (
      substitution &&
      !substitution.is_fixture &&
      evaluateExercise(substitution, rules).length === 0
    ) {
      allowed.push({ exercise: substitution, substituted_for: exercise.slug });
      trace.push({
        rule_id: "gate",
        detail: `${exercise.name} blocked by ${ruleList}; substituted ${substitution.name}`,
        rows: [`exercises ${exercise.slug}`, `exercises ${substitution.slug}`],
      });
    } else {
      trace.push({
        rule_id: "gate",
        detail: `${exercise.name} blocked by ${ruleList}; no passing substitution`,
        rows: [`exercises ${exercise.slug}`],
      });
    }
  }

  return { allowed, trace };
}
