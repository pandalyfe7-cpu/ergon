import { describe, expect, it } from "vitest";

import { prescribeNext } from "@/lib/engine/prescription";
import type { Exercise, LoggedSet } from "@/lib/types";

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-1",
    user_id: "test-user",
    name: "Test lift",
    stimulus_weights: {},
    constraints: [],
    created_at: "2026-08-01T00:00:00Z",
    slug: "test-lift",
    equipment: null,
    movement_pattern: "horizontal_push",
    loading_axis: "appendicular",
    required_position: "seated",
    joint_range: "full",
    flags: [],
    substitution_slug: null,
    is_fixture: false,
    seed_version: null,
    ...overrides,
  };
}

function set(weight_lb: number, reps: number, rpe: number | null): LoggedSet {
  return {
    id: `set-${weight_lb}-${reps}`,
    user_id: "test-user",
    session_id: "session-1",
    exercise_id: "ex-1",
    weight_lb,
    reps,
    rpe,
    is_warmup: false,
    set_order: 1,
    performed_at: "2026-08-18T10:00:00Z",
  };
}

const range = { rep_min: 8, rep_max: 12 };

describe("load progression cap", () => {
  it("allows the standard 5 lb step when it is within 10%", () => {
    // 100 lb topped out easy: +5 = 105, cap = 110. Allowed.
    const aim = prescribeNext(exercise(), [set(100, 12, 7), set(100, 12, 7)], range);
    expect(aim!.rule).toBe("add_load");
    expect(aim!.weight_lb).toBe(105);
  });

  it("never suggests an increase above 10% over the last working weight", () => {
    // 15 lb laterals topped out easy: +5 = 20 lb = 33%. Cap floor(16.5) = 15.
    const aim = prescribeNext(exercise(), [set(15, 12, 6), set(15, 12, 6)], range);
    expect(aim!.rule).toBe("load_cap");
    expect(aim!.weight_lb).toBe(15);
    expect(aim!.weight_lb).toBeLessThanOrEqual(15 * 1.1);
    expect(aim!.reason).toContain("10%");
  });

  it("clamps to the nearest 2.5 lb step under the cap", () => {
    // 45 lb topped: +5 = 50 > cap 49.5 -> floor to 47.5.
    const aim = prescribeNext(exercise(), [set(45, 12, 7)], range);
    expect(aim!.rule).toBe("load_cap");
    expect(aim!.weight_lb).toBe(47.5);
    expect(aim!.weight_lb).toBeLessThanOrEqual(45 * 1.1);
  });

  it("never increases load and reps in the same session", () => {
    // add_load: load moves, rep target stays the range floor-to-max unchanged.
    const addLoad = prescribeNext(exercise(), [set(100, 12, 7)], range)!;
    expect(addLoad.rule).toBe("add_load");
    expect(addLoad.rep_min).toBe(range.rep_min);
    expect(addLoad.rep_max).toBe(range.rep_max);

    // add_reps: reps push up, weight held exactly.
    const addReps = prescribeNext(exercise(), [set(100, 9, 6.5)], range)!;
    expect(addReps.rule).toBe("add_reps");
    expect(addReps.weight_lb).toBe(100);
  });

  it("holds everything after a near-maximal session", () => {
    const aim = prescribeNext(exercise(), [set(100, 10, 9.5)], range)!;
    expect(aim.rule).toBe("hold_rest");
    expect(aim.weight_lb).toBe(100);
    expect(aim.rest).toBe(true);
  });

  it("holds when no RPE was recorded rather than guessing", () => {
    const aim = prescribeNext(exercise(), [set(100, 12, null)], range)!;
    expect(aim.rule).toBe("hold_no_rpe");
    expect(aim.weight_lb).toBe(100);
  });
});
