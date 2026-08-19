/**
 * Shared test fixtures. Seed files are loaded directly so tests prove the
 * shipped library and constraint table behave, not a lookalike.
 */

import { readFileSync } from "node:fs";

import type { EngineState, RotationSessionState } from "@/lib/engine/types";
import { DEFAULT_WEIGHTS } from "@/lib/engine/weights";
import type {
  ConstraintRuleRow,
  GatePredicate,
  TaggedExercise,
} from "@/lib/types";

type SeedExercise = {
  slug: string;
  name: string;
  movement_pattern: TaggedExercise["movement_pattern"];
  loading_axis: TaggedExercise["loading_axis"];
  required_position: TaggedExercise["required_position"];
  joint_range: TaggedExercise["joint_range"];
  flags: TaggedExercise["flags"];
  substitution: string | null;
  fixture: boolean;
};

type SeedSession = {
  rotation_index: number;
  name: string;
  items: { slug: string; sets: number; rep_min: number; rep_max: number }[];
};

const exercisesSeed = JSON.parse(readFileSync("seed/exercises.json", "utf8")) as {
  version: string;
  exercises: SeedExercise[];
  sessions: SeedSession[];
};

const constraintsSeed = JSON.parse(readFileSync("seed/constraints.json", "utf8")) as {
  version: string;
  rules: { rule_id: string; description: string; predicate: GatePredicate }[];
};

export function seedTagged(e: SeedExercise): TaggedExercise {
  return {
    slug: e.slug,
    name: e.name,
    movement_pattern: e.movement_pattern,
    loading_axis: e.loading_axis,
    required_position: e.required_position,
    joint_range: e.joint_range,
    flags: e.flags,
    substitution_slug: e.substitution,
    is_fixture: e.fixture,
  };
}

export const SEED_EXERCISES: TaggedExercise[] = exercisesSeed.exercises.map(seedTagged);
export const SEED_SESSIONS = exercisesSeed.sessions;
export const SEED_LIBRARY = new Map(SEED_EXERCISES.map((e) => [e.slug, e]));
export const FIXTURE_SLUGS = SEED_EXERCISES.filter((e) => e.is_fixture).map((e) => e.slug);

export const SEED_RULES: ConstraintRuleRow[] = constraintsSeed.rules.map((r, i) => ({
  id: `rule-${i}`,
  user_id: "test-user",
  rule_id: r.rule_id,
  description: r.description,
  predicate: r.predicate,
  active: true,
  seed_version: constraintsSeed.version,
  created_at: "2026-08-19T00:00:00Z",
}));

export function rotationSessions(): RotationSessionState[] {
  return SEED_SESSIONS.map((s) => {
    const exercises = s.items.map((item) => {
      const found = SEED_LIBRARY.get(item.slug);
      if (!found) throw new Error(`seed session references unknown slug ${item.slug}`);
      return found;
    });
    return {
      rotationIndex: s.rotation_index,
      templateId: `template-${s.rotation_index}`,
      name: s.name,
      patterns: [...new Set(exercises.map((e) => e.movement_pattern))],
      exercises,
      lastPerformedDate: null,
      estMinutes: 50,
    };
  });
}

export const TODAY = "2026-08-19";

/** A healthy baseline state with plenty of history; override what the test needs. */
export function makeState(overrides: Partial<EngineState> = {}): EngineState {
  return {
    today: TODAY,
    historyDays: 30,
    rotation: { position: 0, sessions: rotationSessions() },
    trainedDates: [],
    patternsByDate: {},
    habits: [
      {
        slug: "morning-entry",
        name: "Morning entry",
        state: "build",
        streak: 4,
        lastCompletedDate: "2026-08-18",
        decayWindowDays: 2,
        floorAction: "Log sleep hours only.",
        markedToday: false,
      },
      {
        slug: "protein-target",
        name: "Protein target",
        state: "build",
        streak: 2,
        lastCompletedDate: "2026-08-18",
        decayWindowDays: 2,
        floorAction: "Log one protein-anchored meal.",
        markedToday: false,
      },
    ],
    metrics: [
      {
        slug: "training-days",
        name: "Training days",
        unit: "days",
        direction: "into_band",
        current: 3,
        floor: 4,
        ceiling: 6,
        trend7d: "flat",
      },
    ],
    morning: { sleepHours: 7.5, sleepQuality: 7 },
    timeAvailableMin: 90,
    bodyweightLastLoggedDate: TODAY,
    constraints: SEED_RULES,
    library: SEED_LIBRARY,
    weights: { ...DEFAULT_WEIGHTS },
    seedVersions: { exercises: exercisesSeed.version, constraints: constraintsSeed.version },
    ...overrides,
  };
}
