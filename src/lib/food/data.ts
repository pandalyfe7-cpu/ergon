import { getTimeZone, requireUser } from "@/lib/data";
import { dayWindow } from "@/lib/time";
import type { Food, LoggedMeal, Recipe } from "@/lib/types";

/** How many distinct foods the recents row shows. */
const RECENTS_LIMIT = 10;
/** Meals scanned to fill that row. */
const HISTORY_SCAN = 200;

export type MealRow = { meal: LoggedMeal; food: Food };

export type FoodLogData = {
  /** Every food, ordered by name. Backs search, saved, and today's rows. */
  foods: Food[];
  recents: Food[];
  saved: Food[];
  today: MealRow[];
};

export async function getFoodLogData(): Promise<FoodLogData> {
  const { supabase } = await requireUser();
  const timeZone = await getTimeZone();
  const { start, end } = dayWindow(timeZone);

  const [foodsResult, todayResult, historyResult] = await Promise.all([
    supabase.from("foods").select("*").order("name"),
    supabase
      .from("logged_meals")
      .select("*")
      .gte("eaten_at", start.toISOString())
      .lt("eaten_at", end.toISOString())
      .order("eaten_at"),
    supabase
      .from("logged_meals")
      .select("food_id")
      .order("eaten_at", { ascending: false })
      .limit(HISTORY_SCAN),
  ]);

  const foods = foodsResult.data ?? [];
  const byId = new Map<string, Food>(foods.map((food) => [food.id, food]));

  const recents: Food[] = [];
  const seen = new Set<string>();
  for (const row of historyResult.data ?? []) {
    if (recents.length >= RECENTS_LIMIT) break;
    if (seen.has(row.food_id)) continue;
    seen.add(row.food_id);
    const food = byId.get(row.food_id);
    if (food) recents.push(food);
  }

  const today = (todayResult.data ?? []).flatMap((meal) => {
    const food = byId.get(meal.food_id);
    return food ? [{ meal, food }] : [];
  });

  return {
    foods,
    recents,
    saved: foods.filter((food) => food.is_saved),
    today,
  };
}

export async function getFoods(): Promise<Food[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("foods").select("*").order("name");
  return data ?? [];
}

export async function getRecipes(): Promise<Recipe[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("recipes").select("*").order("name");
  return data ?? [];
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
  return data;
}
