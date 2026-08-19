import { describe, expect, it } from "vitest";

import { evaluateExercise, gateExercises } from "@/lib/engine/gate";
import {
  FIXTURE_SLUGS,
  SEED_EXERCISES,
  SEED_LIBRARY,
  SEED_RULES,
  SEED_SESSIONS,
} from "./helpers";

describe("constraint gate", () => {
  it("passes every non-fixture exercise in the shipped library", () => {
    for (const exercise of SEED_EXERCISES.filter((e) => !e.is_fixture)) {
      const violations = evaluateExercise(exercise, SEED_RULES);
      expect(violations, `${exercise.slug} should pass the gate`).toEqual([]);
    }
  });

  it("covers every session slot with a passing exercise", () => {
    for (const session of SEED_SESSIONS) {
      for (const item of session.items) {
        const exercise = SEED_LIBRARY.get(item.slug);
        expect(exercise, `${item.slug} exists`).toBeDefined();
        expect(exercise!.is_fixture).toBe(false);
      }
    }
  });

  it("rejects each contraindicated fixture with the expected rule", () => {
    const expected: Record<string, string> = {
      "barbell-back-squat": "no-standing-axial",
      "conventional-deadlift": "no-standing-axial",
      "standing-barbell-ohp": "no-standing-axial",
      "barbell-walking-lunge": "no-standing-axial",
      "standing-machine-calf-raise": "no-standing-axial",
      "box-jump": "left-leg-hardware",
    };
    for (const slug of FIXTURE_SLUGS) {
      const exercise = SEED_LIBRARY.get(slug)!;
      const violations = evaluateExercise(exercise, SEED_RULES);
      expect(violations.length, `${slug} must violate at least one rule`).toBeGreaterThan(0);
      expect(violations.map((v) => v.rule_id)).toContain(expected[slug]);
    }
  });

  it("flags the specific rules for each fixture correctly", () => {
    const squat = SEED_LIBRARY.get("barbell-back-squat")!;
    const rules = evaluateExercise(squat, SEED_RULES).map((v) => v.rule_id);
    // Standing axial, deep knee flexion past 30-90, and valsalva all fire.
    expect(rules).toContain("no-standing-axial");
    expect(rules).toContain("knee-rom-30-90");
    expect(rules).toContain("no-valsalva");

    const ohp = SEED_LIBRARY.get("standing-barbell-ohp")!;
    const ohpRules = evaluateExercise(ohp, SEED_RULES).map((v) => v.rule_id);
    expect(ohpRules).toContain("overhead-seated");
  });

  it("substitutes the tagged alternative when the original is blocked", () => {
    const standingCalf = SEED_LIBRARY.get("standing-machine-calf-raise")!;
    const outcome = gateExercises([standingCalf], SEED_RULES, SEED_LIBRARY);
    // The fixture is dropped outright (is_fixture), never substituted-through.
    expect(outcome.allowed).toEqual([]);

    // A non-fixture with blocking tags gets its substitution.
    const hypothetical = {
      ...standingCalf,
      slug: "gym-standing-calf",
      name: "Standing calf raise",
      is_fixture: false,
    };
    const library = new Map(SEED_LIBRARY);
    library.set(hypothetical.slug, hypothetical);
    const substituted = gateExercises([hypothetical], SEED_RULES, library);
    expect(substituted.allowed).toHaveLength(1);
    expect(substituted.allowed[0].exercise.slug).toBe("seated-calf-raise");
    expect(substituted.allowed[0].substituted_for).toBe("gym-standing-calf");
    expect(substituted.trace[0].detail).toContain("blocked by no-standing-axial");
  });

  it("drops a blocked exercise whose substitution is also blocked", () => {
    const blocked = {
      slug: "test-standing-press",
      name: "Standing press",
      movement_pattern: "vertical_push" as const,
      loading_axis: "axial_spinal" as const,
      required_position: "standing" as const,
      joint_range: "full" as const,
      flags: [],
      substitution_slug: "test-standing-press-2",
      is_fixture: false,
    };
    const alsoBlocked = {
      ...blocked,
      slug: "test-standing-press-2",
      substitution_slug: null,
    };
    const library = new Map(SEED_LIBRARY);
    library.set(blocked.slug, blocked);
    library.set(alsoBlocked.slug, alsoBlocked);
    const outcome = gateExercises([blocked], SEED_RULES, library);
    expect(outcome.allowed).toEqual([]);
    expect(outcome.trace[0].detail).toContain("no passing substitution");
  });

  it("never lets a fixture through even with innocuous tags", () => {
    const wolf = {
      slug: "wolf-in-sheeps-clothing",
      name: "Fixture with clean tags",
      movement_pattern: "elbow_flexion" as const,
      loading_axis: "appendicular" as const,
      required_position: "seated" as const,
      joint_range: "full" as const,
      flags: [],
      substitution_slug: null,
      is_fixture: true,
    };
    const outcome = gateExercises([wolf], SEED_RULES, SEED_LIBRARY);
    expect(outcome.allowed).toEqual([]);
  });

  it("ignores inactive rules", () => {
    const inactive = SEED_RULES.map((r) => ({ ...r, active: false }));
    const squat = { ...SEED_LIBRARY.get("barbell-back-squat")!, is_fixture: false };
    expect(evaluateExercise(squat, inactive)).toEqual([]);
  });
});
