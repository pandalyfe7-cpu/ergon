import { getTimeZone, requireUser } from "@/lib/data";
import { formatWeekday } from "@/lib/time";
import { personalRecords } from "@/lib/training/records";
import { totalVolume } from "@/lib/training/sets";
import { weeklyStimulus } from "@/lib/training/stimulus";
import { MUSCLE_GROUPS, type Exercise, type LoggedSet, type MuscleGroup, type Session } from "@/lib/types";

/** Sessions on the list. Older ones stay reachable by URL. */
const HISTORY_LIMIT = 100;

/** How many exercises a list row previews before "see all". */
export const PREVIEW_COUNT = 3;

export type ExercisePreview = { id: string; name: string; sets: number };

export type SessionSummary = {
  session: Session;
  dateLabel: string;
  durationMs: number;
  volume: number;
  /** In the order the session first touched them. */
  exercises: ExercisePreview[];
};

/** One muscle's share of the session, from weeklyStimulus scoped to its sets. */
export type MuscleShare = {
  muscle: MuscleGroup;
  total: number;
  /** Percent of the session's stimulus across all muscles. */
  percent: number;
};

export type ExerciseBlock = {
  exercise: Exercise;
  /** Every set of this exercise in set_order, warm-ups included. */
  sets: LoggedSet[];
  /** The all-time best weight_lb times reps, or null with no history. */
  best: number | null;
};

export type SessionDetail = {
  session: Session;
  dateLabel: string;
  durationMs: number;
  volume: number;
  split: MuscleShare[];
  touched: Set<MuscleGroup>;
  blocks: ExerciseBlock[];
};

function durationOf(session: Session): number {
  if (!session.ended_at) return 0;
  return new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
}

/** Exercises in the order the session first touched them, with set counts. */
function orderExercises(
  sets: LoggedSet[],
  exercisesById: Map<string, Exercise>,
): ExercisePreview[] {
  const counts = new Map<string, number>();
  for (const set of [...sets].sort((a, b) => a.set_order - b.set_order)) {
    counts.set(set.exercise_id, (counts.get(set.exercise_id) ?? 0) + 1);
  }

  return [...counts].flatMap(([id, count]) => {
    const exercise = exercisesById.get(id);
    return exercise ? [{ id, name: exercise.name, sets: count }] : [];
  });
}

export async function getSessionHistory(): Promise<SessionSummary[]> {
  const { supabase } = await requireUser();
  const timeZone = await getTimeZone();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (!sessions || sessions.length === 0) return [];

  const [setsResult, exercisesResult] = await Promise.all([
    supabase
      .from("logged_sets")
      .select("*")
      .in(
        "session_id",
        sessions.map((session) => session.id),
      ),
    supabase.from("exercises").select("*"),
  ]);

  const exercisesById = new Map<string, Exercise>(
    (exercisesResult.data ?? []).map((exercise) => [exercise.id, exercise]),
  );

  const setsBySession = new Map<string, LoggedSet[]>();
  for (const set of setsResult.data ?? []) {
    const rows = setsBySession.get(set.session_id);
    if (rows) rows.push(set);
    else setsBySession.set(set.session_id, [set]);
  }

  return sessions.map((session) => {
    const sets = setsBySession.get(session.id) ?? [];
    return {
      session,
      dateLabel: formatWeekday(timeZone, new Date(session.started_at)),
      durationMs: durationOf(session),
      volume: totalVolume(sets),
      exercises: orderExercises(sets, exercisesById),
    };
  });
}

/**
 * One finished session in full.
 *
 * The muscle split is weeklyStimulus scoped to this session's sets, turned into
 * percentages of the session's own total. Personal-record marks come from
 * personalRecords over all working-set history, so a set is tagged when it
 * matches or beats that exercise's best. Neither calculation is repeated here.
 */
export async function getSessionDetail(id: string): Promise<SessionDetail | null> {
  const { supabase } = await requireUser();
  const timeZone = await getTimeZone();

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!session || session.ended_at === null) return null;

  const [setsResult, exercisesResult, historyResult] = await Promise.all([
    supabase.from("logged_sets").select("*").eq("session_id", id).order("set_order"),
    supabase.from("exercises").select("*"),
    supabase
      .from("logged_sets")
      .select("exercise_id, weight_lb, reps, is_warmup, performed_at")
      .eq("is_warmup", false),
  ]);

  const sets = setsResult.data ?? [];
  const exercisesById = new Map<string, Exercise>(
    (exercisesResult.data ?? []).map((exercise) => [exercise.id, exercise]),
  );

  const totals = weeklyStimulus(sets, exercisesById);
  const grandTotal = MUSCLE_GROUPS.reduce((sum, muscle) => sum + totals[muscle].total, 0);

  const split: MuscleShare[] = MUSCLE_GROUPS.flatMap((muscle) => {
    const total = totals[muscle].total;
    if (total <= 0) return [];
    return [{ muscle, total, percent: (total / grandTotal) * 100 }];
  }).sort((a, b) => b.total - a.total || a.muscle.localeCompare(b.muscle));

  const bestByExercise = new Map(
    personalRecords(historyResult.data ?? [], exercisesById).map((record) => [
      record.exercise.id,
      record.best,
    ]),
  );

  const blocks: ExerciseBlock[] = orderExercises(sets, exercisesById).flatMap((preview) => {
    const exercise = exercisesById.get(preview.id);
    if (!exercise) return [];
    return [
      {
        exercise,
        sets: sets.filter((set) => set.exercise_id === preview.id),
        best: bestByExercise.get(preview.id) ?? null,
      },
    ];
  });

  return {
    session,
    dateLabel: formatWeekday(timeZone, new Date(session.started_at)),
    durationMs: durationOf(session),
    volume: totalVolume(sets),
    split,
    touched: new Set(split.map((share) => share.muscle)),
    blocks,
  };
}
