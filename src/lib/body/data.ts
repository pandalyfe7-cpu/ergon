import { getTimeZone, requireUser } from "@/lib/data";
import { formatWeekRange, weekWindow, type WeekWindow } from "@/lib/time";
import {
  muscleTrends,
  weeklyStimulus,
  type StimulusTotals,
  type TrendTotals,
} from "@/lib/training/stimulus";
import type { Exercise, LoggedSet } from "@/lib/types";

export const TREND_WEEKS = [4, 8, 12] as const;
export type TrendWeeks = (typeof TREND_WEEKS)[number];

export type BodyMode = "week" | "trend";

export type WeekData = {
  mode: "week";
  totals: StimulusTotals;
  weeksAgo: number;
  label: string;
  /** False when the week holds no non-warm-up sets at all. */
  hasWork: boolean;
};

export type TrendData = {
  mode: "trend";
  trends: TrendTotals;
  weeks: TrendWeeks;
  /** One label per week of the timeframe, oldest first. */
  weekLabels: string[];
  hasWork: boolean;
};

export type BodyData = WeekData | TrendData;

async function loadContext() {
  const { supabase } = await requireUser();
  const timeZone = await getTimeZone();
  const { data: exercises } = await supabase.from("exercises").select("*");
  const exercisesById = new Map<string, Exercise>(
    (exercises ?? []).map((exercise) => [exercise.id, exercise]),
  );
  return { supabase, timeZone, exercisesById };
}

type Supabase = Awaited<ReturnType<typeof loadContext>>["supabase"];

async function loadSets(supabase: Supabase, from: Date, to: Date): Promise<LoggedSet[]> {
  const { data } = await supabase
    .from("logged_sets")
    .select("*")
    .gte("performed_at", from.toISOString())
    .lt("performed_at", to.toISOString())
    .order("performed_at");
  return data ?? [];
}

function inWindow(sets: LoggedSet[], window: WeekWindow): LoggedSet[] {
  const from = window.start.getTime();
  const to = window.end.getTime();
  return sets.filter((set) => {
    const at = new Date(set.performed_at).getTime();
    return at >= from && at < to;
  });
}

function anyWork(totals: StimulusTotals[]): boolean {
  return totals.some((week) => Object.values(week).some((muscle) => muscle.total > 0));
}

export async function getWeekData(weeksAgo: number): Promise<WeekData> {
  const { supabase, timeZone, exercisesById } = await loadContext();
  const window = weekWindow(timeZone, weeksAgo);
  const sets = await loadSets(supabase, window.start, window.end);
  const totals = weeklyStimulus(sets, exercisesById);

  return {
    mode: "week",
    totals,
    weeksAgo,
    label: formatWeekRange(window),
    hasWork: anyWork([totals]),
  };
}

export async function getTrendData(weeks: TrendWeeks): Promise<TrendData> {
  const { supabase, timeZone, exercisesById } = await loadContext();

  // Oldest first, so index 0 is the start of the prior period.
  const windows = Array.from({ length: weeks * 2 }, (_, index) =>
    weekWindow(timeZone, weeks * 2 - 1 - index),
  );

  const sets = await loadSets(
    supabase,
    windows[0].start,
    windows[windows.length - 1].end,
  );

  const perWeek = windows.map((window) =>
    weeklyStimulus(inWindow(sets, window), exercisesById),
  );

  const priorWeeks = perWeek.slice(0, weeks);
  const currentWeeks = perWeek.slice(weeks);

  return {
    mode: "trend",
    trends: muscleTrends(currentWeeks, priorWeeks),
    weeks,
    weekLabels: windows.slice(weeks).map((window) => formatWeekRange(window)),
    hasWork: anyWork(currentWeeks),
  };
}
