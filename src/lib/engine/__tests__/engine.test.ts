import { describe, expect, it } from "vitest";

import { runEngine } from "@/lib/engine/engine";
import type { EngineState } from "@/lib/engine/types";
import {
  FIXTURE_SLUGS,
  makeState,
  rotationSessions,
  SEED_LIBRARY,
  SEED_RULES,
  TODAY,
} from "./helpers";

/** Every exercise surfaced anywhere in an output. */
function surfacedSlugs(state: EngineState): string[] {
  const output = runEngine(state);
  return output.recommendations.flatMap(
    (rec) => rec.exercises?.map((e) => e.exercise.slug) ?? [],
  );
}

describe("engine output shape", () => {
  it("returns at most four recommendations", () => {
    const output = runEngine(makeState());
    expect(output.recommendations.length).toBeLessThanOrEqual(4);
  });

  it("is deterministic for identical state", () => {
    const a = runEngine(makeState());
    const b = runEngine(makeState());
    expect(a).toEqual(b);
  });

  it("returns nothing when no candidate clears the threshold", () => {
    const state = makeState({
      habits: [],
      metrics: [],
      bodyweightLastLoggedDate: TODAY,
    });
    // Make the only session fresh enough to score near zero.
    state.rotation.sessions[0].lastPerformedDate = TODAY;
    const output = runEngine(state);
    expect(output.recommendations).toEqual([]);
  });

  it("names rule ids and data rows on every recommendation", () => {
    const output = runEngine(makeState());
    for (const rec of output.recommendations) {
      expect(rec.ruleIds.length).toBeGreaterThan(0);
      expect(rec.trace.length).toBeGreaterThan(0);
      expect(rec.reason.length).toBeGreaterThan(0);
    }
  });
});

describe("hard invariant: contraindicated movements never surface", () => {
  // A rotation whose next session was tampered to include every fixture,
  // plus a non-fixture standing axial movement. The gate must strip them all
  // in every state variation below.
  function tamperedState(overrides: Partial<EngineState> = {}): EngineState {
    const sessions = rotationSessions();
    const fixtures = FIXTURE_SLUGS.map((slug) => SEED_LIBRARY.get(slug)!);
    const smuggled = {
      slug: "smuggled-standing-ohp",
      name: "Standing barbell press (non-fixture)",
      movement_pattern: "vertical_push" as const,
      loading_axis: "axial_spinal" as const,
      required_position: "standing" as const,
      joint_range: "full" as const,
      flags: ["valsalva_risk" as const],
      substitution_slug: "seated-db-ohp",
      is_fixture: false,
    };
    sessions[0] = {
      ...sessions[0],
      exercises: [...sessions[0].exercises, ...fixtures, smuggled],
      patterns: [...new Set([...sessions[0].patterns])],
    };
    const state = makeState({ rotation: { position: 0, sessions }, ...overrides });
    state.library = new Map(SEED_LIBRARY);
    state.library.set(smuggled.slug, smuggled);
    return state;
  }

  const variations: [string, Partial<EngineState>][] = [
    ["baseline", {}],
    ["cold start", { historyDays: 3 }],
    ["bad sleep", { morning: { sleepHours: 4, sleepQuality: 2 } }],
    ["no morning entry", { morning: null }],
    ["tight time", { timeAvailableMin: 55 }],
    [
      "high staleness pressure",
      { metrics: [{ slug: "training-days", name: "Training days", unit: "days", direction: "into_band", current: 0, floor: 4, ceiling: 6, trend7d: "down" }] },
    ],
  ];

  for (const [label, overrides] of variations) {
    it(`strips fixtures and blocked movements (${label})`, () => {
      const slugs = surfacedSlugs(tamperedState(overrides));
      for (const fixture of FIXTURE_SLUGS) {
        expect(slugs, `${fixture} must never surface`).not.toContain(fixture);
      }
      expect(slugs).not.toContain("smuggled-standing-ohp");
      // The smuggled movement's substitution is allowed to appear instead.
    });
  }

  it("substitutes rather than drops when the alternative passes", () => {
    const output = runEngine(tamperedState());
    const session = output.recommendations.find((r) => r.kind === "session");
    expect(session).toBeDefined();
    const substituted = session!.exercises!.filter((e) => e.substituted_for !== null);
    expect(substituted.map((e) => e.exercise.slug)).toContain("seated-db-ohp");
    expect(session!.ruleIds).toContain("gate");
  });
});

describe("coaching guardrails", () => {
  it("recovery first: short sleep puts recovery above training", () => {
    const output = runEngine(makeState({ morning: { sleepHours: 5.2, sleepQuality: 4 } }));
    const kinds = output.recommendations.map((r) => r.kind);
    const firstSession = kinds.indexOf("session");
    const firstRecovery = kinds.indexOf("recovery");
    expect(firstRecovery).toBeGreaterThanOrEqual(0);
    if (firstSession >= 0) {
      expect(firstRecovery).toBeLessThan(firstSession);
    }
    const recovery = output.recommendations[firstRecovery];
    expect(recovery.ruleIds).toContain("recovery_first");
    expect(recovery.reason).toContain("5.2 h");
  });

  it("recovery first: poor quality alone triggers it", () => {
    const output = runEngine(makeState({ morning: { sleepHours: 8, sleepQuality: 2 } }));
    const primary = output.recommendations[0];
    expect(primary.kind).not.toBe("session");
    expect(primary.ruleIds).toContain("recovery_first");
  });

  it("no pattern stacking: yesterday's patterns block today's session", () => {
    const state = makeState({
      patternsByDate: { "2026-08-18": ["horizontal_push", "vertical_push"] },
    });
    const output = runEngine(state);
    // Next session is Push A which shares horizontal_push and vertical_push.
    expect(output.recommendations.every((r) => r.kind !== "session")).toBe(true);
  });

  it("never skips the rotation forward to chase staleness", () => {
    // Position 0 (Push A) blocked by stacking; Legs A (position 2) is stale
    // but must NOT appear: the rotation order is respected.
    const state = makeState({
      patternsByDate: { "2026-08-18": ["horizontal_push"] },
    });
    state.rotation.sessions[2].lastPerformedDate = "2026-08-01";
    const output = runEngine(state);
    const sessionRecs = output.recommendations.filter((r) => r.kind === "session");
    expect(sessionRecs).toEqual([]);
  });

  it("rest after three consecutive training days outranks training", () => {
    const state = makeState({
      trainedDates: ["2026-08-18", "2026-08-17", "2026-08-16"],
    });
    const output = runEngine(state);
    const primary = output.recommendations[0];
    expect(["rest", "recovery"]).toContain(primary.kind);
    expect(primary.ruleIds).toContain("rest_pressure");
    const sessionIndex = output.recommendations.findIndex((r) => r.kind === "session");
    if (sessionIndex >= 0) {
      expect(sessionIndex).toBeGreaterThan(0);
    }
  });

  it("time honesty: nothing recommended exceeds the time available", () => {
    const state = makeState({ timeAvailableMin: 15 });
    const output = runEngine(state);
    for (const rec of output.recommendations) {
      expect(rec.estMinutes).toBeLessThanOrEqual(15);
    }
    expect(output.recommendations.every((r) => r.kind !== "session")).toBe(true);
  });

  it("missed habits get the smallest next step, never a catch-up", () => {
    const state = makeState({
      habits: [
        {
          slug: "protein-target",
          name: "Protein target",
          state: "build",
          streak: 0,
          lastCompletedDate: "2026-08-14",
          decayWindowDays: 2,
          floorAction: "Log one protein-anchored meal.",
          markedToday: false,
        },
      ],
    });
    const output = runEngine(state);
    const habitRec = output.recommendations.find((r) => r.kind === "habit");
    expect(habitRec).toBeDefined();
    expect(habitRec!.title).toBe("Log one protein-anchored meal");
    expect(habitRec!.ruleIds).toContain("smallest_next_step");
    expect(habitRec!.reason).not.toMatch(/double|catch.?up|make.?up/i);
  });

  it("dormant habits are never recommended", () => {
    const state = makeState({
      habits: [
        {
          slug: "study-blocks",
          name: "Study blocks",
          state: "dormant",
          streak: 0,
          lastCompletedDate: "2026-07-01",
          decayWindowDays: 3,
          floorAction: "One 10-minute block.",
          markedToday: false,
        },
      ],
    });
    const output = runEngine(state);
    expect(output.recommendations.every((r) => r.ref !== "study-blocks")).toBe(true);
  });
});

describe("cold start", () => {
  it("limits output to the next session and most overdue habit", () => {
    const output = runEngine(makeState({ historyDays: 4 }));
    expect(output.coldStart).toBe(true);
    expect(output.recommendations.length).toBeLessThanOrEqual(2);
    expect(output.waitingOn.length).toBeGreaterThan(0);
    expect(output.waitingOn[0]).toContain("4 of 14");
    const kinds = output.recommendations.map((r) => r.kind);
    expect(kinds.filter((k) => k === "session").length).toBeLessThanOrEqual(1);
    expect(kinds.filter((k) => k === "habit").length).toBeLessThanOrEqual(1);
    for (const rec of output.recommendations) {
      expect(rec.ruleIds).toContain("cold_start");
    }
  });

  it("still applies safety guardrails during cold start", () => {
    const output = runEngine(
      makeState({ historyDays: 4, morning: { sleepHours: 4.5, sleepQuality: 3 } }),
    );
    // Bad sleep: the session must not be the primary even in cold start.
    if (output.recommendations.length > 0) {
      expect(output.recommendations[0].kind).not.toBe("session");
    }
  });

  it("full scoring resumes at fourteen days", () => {
    const output = runEngine(makeState({ historyDays: 14 }));
    expect(output.coldStart).toBe(false);
  });
});

describe("weights are respected", () => {
  it("a zero staleness weight drops the session candidate below threshold", () => {
    const state = makeState({
      weights: { ...makeState().weights, staleness: 0, gap: 0 },
    });
    const output = runEngine(state);
    expect(output.recommendations.every((r) => r.kind !== "session")).toBe(true);
  });

  it("constraint rules from state are what the gate enforces", () => {
    // Deactivate all rules: the tampered non-fixture movement passes, proving
    // the gate reads the constraint table rather than hardcoding.
    const state = makeState();
    const smuggled = {
      slug: "smuggled-standing-ohp",
      name: "Standing barbell press",
      movement_pattern: "vertical_push" as const,
      loading_axis: "axial_spinal" as const,
      required_position: "standing" as const,
      joint_range: "full" as const,
      flags: [],
      substitution_slug: null,
      is_fixture: false,
    };
    state.rotation.sessions[0].exercises.push(smuggled);
    state.library = new Map(SEED_LIBRARY);
    state.library.set(smuggled.slug, smuggled);
    state.constraints = SEED_RULES.map((r) => ({ ...r, active: false }));
    const output = runEngine(state);
    const session = output.recommendations.find((r) => r.kind === "session");
    expect(session?.exercises?.map((e) => e.exercise.slug)).toContain(
      "smuggled-standing-ohp",
    );
  });
});
