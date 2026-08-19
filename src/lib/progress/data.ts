import { getTimeZone, requireUser } from "@/lib/data";
import { sumFoodQuantities } from "@/lib/food/macros";
import { formatWeekRange, localDate, recentDays, shiftDate, weekWindow } from "@/lib/time";
import { personalRecords, type PersonalRecord } from "@/lib/training/records";
import { totalVolume } from "@/lib/training/sets";
import type { Food } from "@/lib/types";

/** Shared by the calorie and volume graphs; one toggle drives both. */
export const TREND_DAYS = [7, 30] as const;
export type TrendDays = (typeof TREND_DAYS)[number];

export const WEIGHT_DAYS = [30, 90, 365] as const;
export type WeightDays = (typeof WEIGHT_DAYS)[number];

/** How far back a streak is looked for. Longer than any streak worth counting. */
const STREAK_SCAN_DAYS = 400;

/** One local day on a graph. A null value is a day with nothing to plot. */
export type DayPoint = { date: string; value: number | null };

export type ProgressData = {
  /** Consecutive days ending today or yesterday with at least one logged meal. */
  streak: number;
  /** False when today has no meal yet, so the number is through yesterday. */
  streakIncludesToday: boolean;

  sessionsThisWeek: number;
  weeklySessionTarget: number;
  weekLabel: string;

  currentWeightLb: number | null;
  /** Local date of that reading, YYYY-MM-DD. */
  currentWeightDate: string | null;
  weightPoints: DayPoint[];
  weightDays: WeightDays;

  caloriePoints: DayPoint[];
  /** Null when no daily_macro_targets row exists; the graph then has no target. */
  calorieTarget: number | null;
  volumePoints: DayPoint[];
  trendDays: TrendDays;

  records: PersonalRecord[];
};

function points(days: string[], values: Map<string, number>): DayPoint[] {
  return days.map((date) => ({ date, value: values.get(date) ?? null }));
}

export async function getProgressData(
  weightDays: WeightDays,
  trendDays: TrendDays,
): Promise<ProgressData> {
  const { supabase } = await requireUser();
  const timeZone = await getTimeZone();

  const today = localDate(timeZone, new Date());
  const week = weekWindow(timeZone);

  const streakDays = recentDays(timeZone, STREAK_SCAN_DAYS);
  const weightSeries = recentDays(timeZone, weightDays);
  const trendSeries = recentDays(timeZone, trendDays);

  // One instant to read meals from: far enough back for the streak scan, which
  // always reaches further than either graph.
  const mealsFrom = `${streakDays[0]}T00:00:00Z`;
  const trendFrom = `${shiftDate(trendSeries[0], -1)}T00:00:00Z`;

  const [
    settingsResult,
    targetResult,
    sessionsResult,
    weightResult,
    mealsResult,
    setsResult,
    exercisesResult,
    recordSetsResult,
  ] = await Promise.all([
    supabase.from("user_settings").select("weekly_session_target").maybeSingle(),
    supabase.from("daily_macro_targets").select("calories").maybeSingle(),
    supabase
      .from("sessions")
      .select("ended_at")
      .not("ended_at", "is", null)
      .gte("ended_at", week.start.toISOString())
      .lt("ended_at", week.end.toISOString()),
    supabase
      .from("bodyweight_logs")
      .select("weight_lb, logged_at")
      .order("logged_at", { ascending: true }),
    supabase
      .from("logged_meals")
      .select("food_id, serving, eaten_at")
      .gte("eaten_at", mealsFrom)
      .order("eaten_at", { ascending: true }),
    supabase
      .from("logged_sets")
      .select("weight_lb, reps, is_warmup, performed_at")
      .gte("performed_at", trendFrom),
    supabase.from("exercises").select("*"),
    supabase
      .from("logged_sets")
      .select("exercise_id, weight_lb, reps, is_warmup, performed_at")
      .eq("is_warmup", false),
  ]);

  const meals = mealsResult.data ?? [];

  // Streak: consecutive days with a meal, walking back from today. Today not
  // being logged yet does not break it, so the count runs through yesterday.
  const mealDates = new Set(meals.map((meal) => localDate(timeZone, new Date(meal.eaten_at))));
  const streakIncludesToday = mealDates.has(today);
  let cursor = streakIncludesToday ? today : shiftDate(today, -1);
  let streak = 0;
  while (mealDates.has(cursor) && streak < STREAK_SCAN_DAYS) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }

  // Bodyweight: last reading of each local day, so a day weighed twice plots once.
  const weightByDay = new Map<string, number>();
  for (const log of weightResult.data ?? []) {
    weightByDay.set(localDate(timeZone, new Date(log.logged_at)), log.weight_lb);
  }
  const latestWeight = (weightResult.data ?? []).at(-1) ?? null;

  // Calories: the food flow's own per-serving math, bucketed by local day.
  const calorieByDay = new Map<string, number>();
  if (meals.length > 0) {
    const foodIds = [...new Set(meals.map((meal) => meal.food_id))];
    const { data: foods } = await supabase.from("foods").select("*").in("id", foodIds);
    const byId = new Map<string, Food>((foods ?? []).map((food) => [food.id, food]));

    const mealsByDay = new Map<string, Array<{ food: Food; quantity: number }>>();
    for (const meal of meals) {
      const food = byId.get(meal.food_id);
      if (!food) continue;
      const date = localDate(timeZone, new Date(meal.eaten_at));
      const items = mealsByDay.get(date);
      if (items) items.push({ food, quantity: meal.serving });
      else mealsByDay.set(date, [{ food, quantity: meal.serving }]);
    }

    for (const [date, items] of mealsByDay) {
      calorieByDay.set(date, sumFoodQuantities(items).calories);
    }
  }

  // Volume: weight times reps over a day's working sets. Days without sets have
  // no point rather than a zero, so the line does not dive on rest days.
  const setsByDay = new Map<string, Array<{ is_warmup: boolean; weight_lb: number; reps: number }>>();
  for (const set of setsResult.data ?? []) {
    const date = localDate(timeZone, new Date(set.performed_at));
    const rows = setsByDay.get(date);
    if (rows) rows.push(set);
    else setsByDay.set(date, [set]);
  }

  const volumeByDay = new Map<string, number>();
  for (const [date, rows] of setsByDay) {
    const volume = totalVolume(rows);
    if (volume > 0) volumeByDay.set(date, volume);
  }

  const exercisesById = new Map((exercisesResult.data ?? []).map((ex) => [ex.id, ex]));

  return {
    streak,
    streakIncludesToday,
    sessionsThisWeek: (sessionsResult.data ?? []).length,
    weeklySessionTarget: settingsResult.data?.weekly_session_target ?? 0,
    weekLabel: formatWeekRange(week),

    currentWeightLb: latestWeight?.weight_lb ?? null,
    currentWeightDate: latestWeight
      ? localDate(timeZone, new Date(latestWeight.logged_at))
      : null,
    weightPoints: points(weightSeries, weightByDay),
    weightDays,

    caloriePoints: points(trendSeries, calorieByDay),
    calorieTarget: targetResult.data?.calories ?? null,
    volumePoints: points(trendSeries, volumeByDay),
    trendDays,

    records: personalRecords(recordSetsResult.data ?? [], exercisesById),
  };
}
