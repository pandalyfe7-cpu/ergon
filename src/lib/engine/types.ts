/**
 * Engine state: a plain-data snapshot of everything scoring reads. The
 * service layer builds it from Supabase; tests construct it synthetically.
 * The engine itself does no I/O and reads no clocks.
 */

import type { GatedExercise } from "@/lib/engine/gate";
import type { WeightsConfig } from "@/lib/engine/weights";
import type {
  ConstraintRuleRow,
  HabitState,
  MovementPattern,
  RecommendationKind,
  TaggedExercise,
  TraceEntry,
} from "@/lib/types";

export type RotationSessionState = {
  rotationIndex: number;
  templateId: string;
  name: string;
  /** Distinct movement patterns of the session's exercises. */
  patterns: MovementPattern[];
  exercises: TaggedExercise[];
  /** Local date this template last ran, null if never. */
  lastPerformedDate: string | null;
  estMinutes: number;
};

export type HabitEngineState = {
  slug: string;
  name: string;
  state: HabitState;
  /** Consecutive days completed ending today or yesterday. */
  streak: number;
  lastCompletedDate: string | null;
  decayWindowDays: number;
  floorAction: string;
  markedToday: boolean;
};

export type MetricEngineState = {
  slug: string;
  name: string;
  unit: string;
  direction: "up" | "down" | "into_band";
  current: number | null;
  floor: number;
  ceiling: number;
  trend7d: "up" | "down" | "flat" | null;
};

export type EngineState = {
  /** Local date, YYYY-MM-DD. The engine's only notion of "now". */
  today: string;
  /** Days since the first logged row of any kind. */
  historyDays: number;
  rotation: { position: number; sessions: RotationSessionState[] };
  /** Recent local dates with a finished session, most recent first. */
  trainedDates: string[];
  /** Movement patterns trained per local date (recent days only). */
  patternsByDate: Record<string, MovementPattern[]>;
  habits: HabitEngineState[];
  metrics: MetricEngineState[];
  morning: { sleepHours: number; sleepQuality: number } | null;
  timeAvailableMin: number;
  bodyweightLastLoggedDate: string | null;
  constraints: ConstraintRuleRow[];
  library: Map<string, TaggedExercise>;
  weights: WeightsConfig;
  seedVersions: Record<string, string>;
};

export type EngineRecommendation = {
  kind: RecommendationKind;
  ref: string;
  title: string;
  reason: string;
  estMinutes: number;
  moves: string | null;
  score: number;
  ruleIds: string[];
  trace: TraceEntry[];
  /** Present on session recommendations, after the gate ran. */
  exercises?: GatedExercise[];
};

export type EngineOutput = {
  /** At most four, sorted by score; index 0 is the primary. Empty means "nothing pressing". */
  recommendations: EngineRecommendation[];
  coldStart: boolean;
  /** Cold start only: what the engine is waiting on, stated plainly. */
  waitingOn: string[];
  engineVersion: string;
};
