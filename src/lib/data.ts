import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { EMPTY_MACROS, type MacroTotals, sumFoodQuantities } from "@/lib/food/macros";
import { createClient } from "@/lib/supabase/server";
import {
  dayWindow,
  FALLBACK_TIME_ZONE,
  formatWeekday,
  isValidTimeZone,
  TIME_ZONE_COOKIE,
} from "@/lib/time";
import type {
  DailyMacroTarget,
  Exercise,
  ExerciseTemplate,
  Food,
  LoggedSet,
  Session,
  TemplateExercise,
  UserSettings,
} from "@/lib/types";

export async function getTimeZone(): Promise<string> {
  const store = await cookies();
  const value = store.get(TIME_ZONE_COOKIE)?.value;
  return value && isValidTimeZone(value) ? value : FALLBACK_TIME_ZONE;
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return { supabase, user };
}

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

/**
 * First run creates the settings row from the column defaults in the migration,
 * so the defaults are not restated here.
 */
async function ensureUserSettings(supabase: Supabase): Promise<UserSettings> {
  const existing = await supabase.from("user_settings").select("*").maybeSingle();
  if (existing.data) return existing.data;

  const created = await supabase.from("user_settings").insert({}).select().single();
  if (created.data) return created.data;

  // A concurrent first load won the unique index; read what it wrote.
  const retry = await supabase.from("user_settings").select("*").single();
  if (retry.data) return retry.data;

  throw new Error(created.error?.message ?? "Could not create user settings");
}

export type TodayData = {
  timeZone: string;
  dateLabel: string;
  settings: UserSettings;
  target: DailyMacroTarget | null;
  consumed: MacroTotals;
  waterMl: number;
  openSession: Session | null;
  templates: ExerciseTemplate[];
};

export async function getTodayData(): Promise<TodayData> {
  const { supabase } = await requireUser();
  const timeZone = await getTimeZone();
  const { start, end } = dayWindow(timeZone);
  const from = start.toISOString();
  const to = end.toISOString();

  const settings = await ensureUserSettings(supabase);

  const [targetResult, mealsResult, waterResult, sessionResult, templatesResult] =
    await Promise.all([
      supabase.from("daily_macro_targets").select("*").maybeSingle(),
      supabase
        .from("logged_meals")
        .select("*")
        .gte("eaten_at", from)
        .lt("eaten_at", to),
      supabase
        .from("water_logs")
        .select("amount_ml")
        .gte("logged_at", from)
        .lt("logged_at", to),
      supabase.from("sessions").select("*").is("ended_at", null).maybeSingle(),
      supabase.from("exercise_templates").select("*").order("name"),
    ]);

  const meals = mealsResult.data ?? [];
  let consumed = EMPTY_MACROS;

  if (meals.length > 0) {
    const foodIds = [...new Set(meals.map((meal) => meal.food_id))];
    const { data: foods } = await supabase.from("foods").select("*").in("id", foodIds);
    const byId = new Map<string, Food>((foods ?? []).map((food) => [food.id, food]));

    consumed = sumFoodQuantities(
      meals.flatMap((meal) => {
        const food = byId.get(meal.food_id);
        return food ? [{ food, quantity: meal.serving }] : [];
      }),
    );
  }

  return {
    timeZone,
    dateLabel: formatWeekday(timeZone),
    settings,
    target: targetResult.data,
    consumed,
    waterMl: (waterResult.data ?? []).reduce((sum, log) => sum + log.amount_ml, 0),
    openSession: sessionResult.data,
    templates: templatesResult.data ?? [],
  };
}

export async function getExercises(): Promise<Exercise[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("exercises").select("*").order("name");
  return data ?? [];
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("exercises").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getTemplates(): Promise<ExerciseTemplate[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("exercise_templates").select("*").order("name");
  return data ?? [];
}

export async function getTemplate(id: string): Promise<ExerciseTemplate | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("exercise_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export type WorkoutData = {
  session: Session;
  /** Template order first, then anything else already logged this session. */
  exercises: Exercise[];
  /** Everything selectable, for freestyle sessions and mid-session additions. */
  library: Exercise[];
  sets: LoggedSet[];
  /** Sets from each exercise's most recent other session, in set_order. */
  previousByExercise: Record<string, LoggedSet[]>;
  prescribedByExercise: Record<string, TemplateExercise>;
};

export async function getWorkoutData(): Promise<WorkoutData | null> {
  const { supabase } = await requireUser();

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .is("ended_at", null)
    .maybeSingle();

  if (!session) return null;

  const [libraryResult, setsResult] = await Promise.all([
    supabase.from("exercises").select("*").order("name"),
    supabase
      .from("logged_sets")
      .select("*")
      .eq("session_id", session.id)
      .order("set_order"),
  ]);

  const library = libraryResult.data ?? [];
  const sets = setsResult.data ?? [];

  let template: ExerciseTemplate | null = null;
  if (session.template_id) {
    const { data } = await supabase
      .from("exercise_templates")
      .select("*")
      .eq("id", session.template_id)
      .maybeSingle();
    template = data;
  }

  const byId = new Map<string, Exercise>(library.map((exercise) => [exercise.id, exercise]));
  const prescribedByExercise: Record<string, TemplateExercise> = {};
  const exercises: Exercise[] = [];
  const seen = new Set<string>();

  for (const row of template?.exercises ?? []) {
    prescribedByExercise[row.exercise_id] = row;
    const exercise = byId.get(row.exercise_id);
    if (exercise && !seen.has(exercise.id)) {
      seen.add(exercise.id);
      exercises.push(exercise);
    }
  }

  for (const set of sets) {
    if (seen.has(set.exercise_id)) continue;
    const exercise = byId.get(set.exercise_id);
    if (exercise) {
      seen.add(exercise.id);
      exercises.push(exercise);
    }
  }

  const previousByExercise: Record<string, LoggedSet[]> = {};
  if (exercises.length > 0) {
    const { data: history } = await supabase
      .from("logged_sets")
      .select("*")
      .in(
        "exercise_id",
        exercises.map((exercise) => exercise.id),
      )
      .neq("session_id", session.id)
      .order("performed_at", { ascending: false })
      .limit(400);

    for (const exercise of exercises) {
      const rows = (history ?? []).filter((set) => set.exercise_id === exercise.id);
      if (rows.length === 0) continue;
      const lastSessionId = rows[0].session_id;
      previousByExercise[exercise.id] = rows
        .filter((set) => set.session_id === lastSessionId)
        .sort((a, b) => a.set_order - b.set_order);
    }
  }

  return { session, exercises, library, sets, previousByExercise, prescribedByExercise };
}
