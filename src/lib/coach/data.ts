import { getTimeZone, requireUser } from "@/lib/data";
import { formatWeekRange, weekWindow } from "@/lib/time";
import { DEFAULT_REP_RANGE, getAimFor, type Aim, type RepRange } from "@/lib/training/aim";
import { weeklyStimulus } from "@/lib/training/stimulus";
import type { Exercise, LoggedSet, MuscleGroup, Timestamp } from "@/lib/types";

/** Muscles under this much weekly stimulus are flagged. Matches the "low" band. */
export const VOLUME_FLOOR = 10;

/** Sets scanned for per-exercise history. Well past a single user's recent work. */
const HISTORY_LIMIT = 600;

export type CoachTarget = {
  exercise: Exercise;
  /** Never null: an exercise without working-set history gets no card. */
  aim: Aim;
  /** How many working sets the recommendation was read from. */
  lastSetCount: number;
  lastTrainedAt: Timestamp;
};

export type VolumeFlag = { muscle: MuscleGroup; total: number };

export type CoachData = {
  /** Most recently trained first. */
  targets: CoachTarget[];
  flags: VolumeFlag[];
  weekLabel: string;
  /** False when no finished session has ever logged a working set. */
  hasHistory: boolean;
};

/**
 * Every exercise with a pending recommendation, plus this week's undertrained
 * muscles.
 *
 * "Pending" means the exercise has working sets from a finished session, so
 * progression has something to read. An open session is excluded: the coach
 * plans the next session, not the one being logged right now.
 *
 * Rep ranges come from the routines an exercise appears in, newest routine
 * first, falling back to DEFAULT_REP_RANGE. Volume flags come from
 * weeklyStimulus over this week's sets, which is the body tab's calculation
 * unchanged.
 */
export async function getCoachData(): Promise<CoachData> {
  const { supabase } = await requireUser();
  const timeZone = await getTimeZone();
  const week = weekWindow(timeZone);

  const [exercisesResult, templatesResult, openResult] = await Promise.all([
    supabase.from("exercises").select("*").order("name"),
    supabase.from("exercise_templates").select("*").order("created_at", { ascending: false }),
    supabase.from("sessions").select("id").is("ended_at", null).maybeSingle(),
  ]);

  const exercises = exercisesResult.data ?? [];
  const exercisesById = new Map<string, Exercise>(
    exercises.map((exercise) => [exercise.id, exercise]),
  );
  const openSessionId = openResult.data?.id ?? null;

  const rangeByExercise = new Map<string, RepRange>();
  for (const template of templatesResult.data ?? []) {
    for (const row of template.exercises) {
      if (rangeByExercise.has(row.exercise_id)) continue;
      rangeByExercise.set(row.exercise_id, { rep_min: row.rep_min, rep_max: row.rep_max });
    }
  }

  const [historyResult, weekResult] = await Promise.all([
    supabase
      .from("logged_sets")
      .select("*")
      .order("performed_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from("logged_sets")
      .select("*")
      .gte("performed_at", week.start.toISOString())
      .lt("performed_at", week.end.toISOString()),
  ]);

  const history = (historyResult.data ?? []).filter(
    (set) => set.session_id !== openSessionId,
  );

  const targets: CoachTarget[] = [];
  for (const exercise of exercises) {
    const rows = history.filter((set) => set.exercise_id === exercise.id);
    if (rows.length === 0) continue;

    const lastSets = rows
      .filter((set) => set.session_id === rows[0].session_id)
      .sort((a, b) => a.set_order - b.set_order);

    const aim = getAimFor(
      exercise,
      lastSets,
      rangeByExercise.get(exercise.id) ?? DEFAULT_REP_RANGE,
    );
    if (!aim) continue;

    targets.push({
      exercise,
      aim,
      lastSetCount: lastSets.filter((set) => !set.is_warmup).length,
      lastTrainedAt: rows[0].performed_at,
    });
  }

  targets.sort((a, b) => b.lastTrainedAt.localeCompare(a.lastTrainedAt));

  const totals = weeklyStimulus(weekResult.data ?? [], exercisesById);
  const flags: VolumeFlag[] = [];
  for (const [muscle, stimulus] of Object.entries(totals) as Array<
    [MuscleGroup, (typeof totals)[MuscleGroup]]
  >) {
    if (stimulus.total < VOLUME_FLOOR) flags.push({ muscle, total: stimulus.total });
  }
  flags.sort((a, b) => a.total - b.total || a.muscle.localeCompare(b.muscle));

  return {
    targets,
    flags,
    weekLabel: formatWeekRange(week),
    hasHistory: targets.length > 0 || hasWorkingSet(history),
  };
}

function hasWorkingSet(sets: LoggedSet[]): boolean {
  return sets.some((set) => !set.is_warmup);
}
