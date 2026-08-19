/**
 * The recommendation engine. Deterministic TypeScript: named rules score
 * candidates, coaching guardrails reorder or drop them, and the constraint
 * gate runs LAST as the final filter. No model chooses actions or loads.
 *
 * Rule ids (traceable in every output):
 *   staleness            days since the next rotation session ran
 *   gap                  metric distance from its target band
 *   decay_risk           habit approaching its decay window
 *   fit                  action fits the time available
 *   smallest_next_step   overdue habit reduced to its floor action
 *   recovery_first       short/poor sleep puts recovery above training
 *   no_pattern_stacking  same movement pattern never on consecutive days
 *   rest_pressure        3 consecutive training days puts rest above training
 *   time_honesty         nothing recommended exceeds time available
 *   cold_start           under two weeks of history limits output
 *   gate                 constraint-table exclusion or substitution
 */

import { gateExercises } from "@/lib/engine/gate";
import type {
  EngineOutput,
  EngineRecommendation,
  EngineState,
  HabitEngineState,
} from "@/lib/engine/types";
import type { TraceEntry } from "@/lib/types";

export const ENGINE_VERSION = "1.0.0";

const COLD_START_DAYS = 14;

/** Whole days between two YYYY-MM-DD dates (b - a). Noon anchor dodges DST. */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000,
  );
}

function shiftDate(date: string, days: number): string {
  const anchor = new Date(`${date}T12:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return anchor.toISOString().slice(0, 10);
}

type Candidate = EngineRecommendation & { dropped?: string };

// Candidate construction --------------------------------------------------------

function sessionCandidate(state: EngineState): Candidate | null {
  const session = state.rotation.sessions.find(
    (s) => s.rotationIndex === state.rotation.position,
  );
  if (!session) return null;

  const w = state.weights;
  const trace: TraceEntry[] = [];
  const ruleIds: string[] = ["staleness"];

  let staleDays: number | null = null;
  let reason: string;
  let score: number;

  if (session.lastPerformedDate) {
    staleDays = daysBetween(session.lastPerformedDate, state.today);
    score = w.staleness * Math.min(staleDays / 3, 2);
    reason = `${session.name} last ran ${staleDays} day${staleDays === 1 ? "" : "s"} ago and is next in the rotation.`;
    trace.push({
      rule_id: "staleness",
      detail: `${session.name} last ran ${session.lastPerformedDate} (${staleDays}d ago)`,
      rows: [`sessions ${session.lastPerformedDate} ${session.name}`],
    });
  } else {
    score = w.staleness;
    reason = `${session.name} has not run yet; the rotation starts here.`;
    trace.push({
      rule_id: "staleness",
      detail: `${session.name} has no logged run`,
      rows: [`exercise_templates rotation_index ${session.rotationIndex}`],
    });
  }

  const trainingDays = state.metrics.find((m) => m.slug === "training-days");
  if (
    trainingDays &&
    trainingDays.current !== null &&
    trainingDays.current < trainingDays.floor
  ) {
    score += state.weights.gap * 0.5;
    ruleIds.push("gap");
    trace.push({
      rule_id: "gap",
      detail: `training days ${trainingDays.current}/7d, band ${trainingDays.floor}-${trainingDays.ceiling}`,
      rows: [`metric_definitions training-days`],
    });
  }

  return {
    kind: "session",
    ref: session.name,
    title: `Train ${session.name}`,
    reason,
    estMinutes: session.estMinutes,
    moves: "training-days",
    score,
    ruleIds,
    trace,
    exercises: session.exercises.map((exercise) => ({
      exercise,
      substituted_for: null,
    })),
  };
}

function habitCandidate(state: EngineState, habit: HabitEngineState): Candidate | null {
  if (habit.state === "dormant" || habit.markedToday) return null;

  const w = state.weights;
  const daysSince = habit.lastCompletedDate
    ? daysBetween(habit.lastCompletedDate, state.today)
    : Math.max(state.historyDays, 1);
  const urgency = daysSince / habit.decayWindowDays;
  const score = w.decay_risk * Math.min(urgency, 2);

  const trace: TraceEntry[] = [
    {
      rule_id: "decay_risk",
      detail: habit.lastCompletedDate
        ? `${habit.name} last done ${habit.lastCompletedDate} (${daysSince}d ago); decay window ${habit.decayWindowDays}d`
        : `${habit.name} has no completion yet; decay window ${habit.decayWindowDays}d`,
      rows: [`habits ${habit.slug}`, ...(habit.lastCompletedDate ? [`habit_events ${habit.lastCompletedDate}`] : [])],
    },
  ];
  const ruleIds = ["decay_risk"];

  let title = habit.name;
  let reason: string;
  let estMinutes = habit.slug === "morning-entry" ? 5 : 10;

  if (urgency >= 1) {
    // Missed past the window: smallest next step, never a catch-up prescription.
    title = habit.floorAction.replace(/\.$/, "");
    ruleIds.push("smallest_next_step");
    reason = habit.lastCompletedDate
      ? `${habit.name} last done ${daysSince} days ago (window ${habit.decayWindowDays}); smallest next step to resume.`
      : `${habit.name} has not started yet; smallest first step.`;
    trace.push({
      rule_id: "smallest_next_step",
      detail: `overdue ${daysSince}d >= window ${habit.decayWindowDays}d; floor action offered`,
      rows: [`habits ${habit.slug}`],
    });
    estMinutes = Math.min(estMinutes, 10);
  } else if (habit.streak > 0) {
    reason = `${habit.name} streak is ${habit.streak} day${habit.streak === 1 ? "" : "s"}; due today to keep it (window ${habit.decayWindowDays}d).`;
  } else {
    reason = `${habit.name} due today; last done ${daysSince} day${daysSince === 1 ? "" : "s"} ago.`;
  }

  return {
    kind: "habit",
    ref: habit.slug,
    title,
    reason,
    estMinutes,
    moves: habit.slug,
    score,
    ruleIds,
    trace,
  };
}

const RECOVERY_ACTIONS = [
  { ref: "walk", title: "20-minute walk", estMinutes: 20 },
  { ref: "mobility", title: "15-minute mobility session", estMinutes: 15 },
  { ref: "early-night", title: "Start wind-down for an early night", estMinutes: 10 },
] as const;

function recoveryCandidates(): Candidate[] {
  return RECOVERY_ACTIONS.map((action) => ({
    kind: "recovery" as const,
    ref: action.ref,
    title: action.title,
    reason: "Low-cost recovery action.",
    estMinutes: action.estMinutes,
    moves: action.ref === "early-night" ? "sleep-duration" : "readiness",
    score: 0.2,
    ruleIds: [],
    trace: [],
  }));
}

function restCandidate(): Candidate {
  return {
    kind: "rest",
    ref: "rest-day",
    title: "Rest day",
    reason: "Recovery is part of the program.",
    estMinutes: 0,
    moves: null,
    score: 0,
    ruleIds: [],
    trace: [],
  };
}

function bodyweightCandidate(state: EngineState): Candidate | null {
  const last = state.bodyweightLastLoggedDate;
  const days = last ? daysBetween(last, state.today) : Math.max(state.historyDays, 3);
  if (days < 3) return null;
  return {
    kind: "metric",
    ref: "log-bodyweight",
    title: "Log bodyweight",
    reason: last
      ? `No bodyweight reading in ${days} days; the protein target derives from it.`
      : "No bodyweight readings yet; the protein target derives from them.",
    estMinutes: 2,
    moves: "bodyweight",
    score: state.weights.gap * 0.8,
    ruleIds: ["gap"],
    trace: [
      {
        rule_id: "gap",
        detail: last
          ? `last bodyweight log ${last} (${days}d ago)`
          : "no bodyweight logs",
        rows: ["bodyweight_logs latest"],
      },
    ],
  };
}

// Guardrails (all before the gate) ---------------------------------------------

function consecutiveTrainedDays(state: EngineState): number {
  let count = 0;
  let cursor = shiftDate(state.today, -1);
  const trained = new Set(state.trainedDates);
  while (trained.has(cursor)) {
    count++;
    cursor = shiftDate(cursor, -1);
  }
  return count;
}

function applyGuardrails(state: EngineState, candidates: Candidate[]): Candidate[] {
  const w = state.weights;

  // Time honesty: nothing that exceeds the time available today.
  let pool = candidates.filter((c) => {
    if (c.estMinutes <= state.timeAvailableMin) return true;
    return false;
  });
  for (const c of pool) {
    if (c.estMinutes <= state.timeAvailableMin * 0.8 && c.estMinutes > 0) {
      c.score += w.fit * 0.2;
      c.ruleIds.push("fit");
      c.trace.push({
        rule_id: "fit",
        detail: `${c.estMinutes} min fits ${state.timeAvailableMin} min available`,
        rows: ["morning_entries time_available"],
      });
    }
  }

  // No pattern stacking: never the same movement pattern on consecutive days.
  const yesterday = shiftDate(state.today, -1);
  const yesterdayPatterns = new Set(state.patternsByDate[yesterday] ?? []);
  pool = pool.filter((c) => {
    if (c.kind !== "session" || !c.exercises) return true;
    const overlap = c.exercises
      .map((e) => e.exercise.movement_pattern)
      .filter((p) => yesterdayPatterns.has(p));
    if (overlap.length === 0) return true;
    return false;
  });

  // Recovery first: short or poor sleep puts recovery above any training.
  const badSleep =
    state.morning !== null &&
    (state.morning.sleepHours < 6 || state.morning.sleepQuality <= 3);
  if (badSleep && state.morning) {
    const { sleepHours, sleepQuality } = state.morning;
    const sleepDetail = `slept ${sleepHours} h, quality ${sleepQuality}/10`;
    for (const c of pool) {
      if (c.kind === "session") {
        c.score *= 0.25;
        c.ruleIds.push("recovery_first");
        c.trace.push({
          rule_id: "recovery_first",
          detail: `${sleepDetail}; training deprioritized`,
          rows: [`morning_entries ${state.today}`],
        });
      }
    }
    const maxTraining = Math.max(
      0,
      ...pool.filter((c) => c.kind === "session").map((c) => c.score),
    );
    for (const c of pool) {
      if (c.kind === "recovery") {
        c.score = Math.max(c.score + w.recovery, maxTraining + 0.01);
        c.ruleIds.push("recovery_first");
        c.reason = `Slept ${sleepHours} h with quality ${sleepQuality}/10; recovery outranks training today.`;
        c.trace.push({
          rule_id: "recovery_first",
          detail: sleepDetail,
          rows: [`morning_entries ${state.today}`],
        });
      }
    }
  }

  // Rest pressure: after 3 consecutive training days, rest outranks training.
  const streak = consecutiveTrainedDays(state);
  if (streak >= 3) {
    const trainedList = state.trainedDates.slice(0, streak).join(", ");
    const maxTraining = Math.max(
      0,
      ...pool.filter((c) => c.kind === "session").map((c) => c.score),
    );
    for (const c of pool) {
      if (c.kind === "rest" || c.kind === "recovery") {
        c.score = Math.max(c.score, maxTraining + w.rest_pressure * 0.5);
        c.ruleIds.push("rest_pressure");
        if (c.kind === "rest") {
          c.reason = `${streak} consecutive training days (${trainedList}); rest outranks training today.`;
        }
        c.trace.push({
          rule_id: "rest_pressure",
          detail: `${streak} consecutive training days`,
          rows: state.trainedDates.slice(0, streak).map((d) => `sessions ${d}`),
        });
      }
    }
  }

  return pool;
}

// Orchestration -------------------------------------------------------------------

const KIND_ORDER = { session: 0, habit: 1, recovery: 2, metric: 3, rest: 4 } as const;

function sortCandidates(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (KIND_ORDER[a.kind] !== KIND_ORDER[b.kind]) {
      return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    }
    return a.ref.localeCompare(b.ref);
  });
}

/** The gate is the FINAL filter; nothing runs after it. */
function applyGate(state: EngineState, candidates: Candidate[]): Candidate[] {
  const result: Candidate[] = [];
  for (const candidate of candidates) {
    if (!candidate.exercises) {
      result.push(candidate);
      continue;
    }
    const outcome = gateExercises(
      candidate.exercises.map((e) => e.exercise),
      state.constraints,
      state.library,
    );
    if (outcome.allowed.length === 0) {
      continue;
    }
    candidate.exercises = outcome.allowed;
    if (outcome.trace.length > 0) {
      candidate.ruleIds.push("gate");
      candidate.trace.push(...outcome.trace);
    }
    result.push(candidate);
  }
  return result;
}

export function runEngine(state: EngineState): EngineOutput {
  const w = state.weights;

  const candidates: Candidate[] = [];
  const session = sessionCandidate(state);
  if (session) candidates.push(session);
  for (const habit of state.habits) {
    const c = habitCandidate(state, habit);
    if (c) candidates.push(c);
  }
  candidates.push(...recoveryCandidates(), restCandidate());
  const bw = bodyweightCandidate(state);
  if (bw) candidates.push(bw);

  const guarded = applyGuardrails(state, candidates);

  // Cold start: under two weeks of history, recommend only the next rotation
  // session and the single most overdue habit, and say what is missing.
  if (state.historyDays < COLD_START_DAYS) {
    const sessionPick = guarded.find((c) => c.kind === "session");
    const habitPick = sortCandidates(guarded.filter((c) => c.kind === "habit"))[0];
    const picks: Candidate[] = [];
    for (const pick of [sessionPick, habitPick]) {
      if (!pick) continue;
      pick.ruleIds.push("cold_start");
      pick.trace.push({
        rule_id: "cold_start",
        detail: `${state.historyDays} of ${COLD_START_DAYS} days of history logged`,
        rows: [],
      });
      picks.push(pick);
    }
    return {
      recommendations: applyGate(state, sortCandidates(picks)),
      coldStart: true,
      waitingOn: [
        `${state.historyDays} of ${COLD_START_DAYS} days of history logged; full scoring starts at ${COLD_START_DAYS}.`,
        "Log the morning entry daily so sleep can steer recommendations.",
        "Finish rotation sessions so staleness has real dates to read.",
        "Mark habits daily so decay risk reflects actual streaks.",
      ],
      engineVersion: ENGINE_VERSION,
    };
  }

  const surfaced = sortCandidates(guarded.filter((c) => c.score >= w.threshold)).slice(0, 4);

  return {
    recommendations: applyGate(state, surfaced),
    coldStart: false,
    waitingOn: [],
    engineVersion: ENGINE_VERSION,
  };
}
