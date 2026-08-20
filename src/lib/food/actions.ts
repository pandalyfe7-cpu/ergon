"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTimeZone, requireUser } from "@/lib/data";
import { checkProteinHabit } from "@/lib/ergos/actions";
import {
  requestFoodEstimate,
  TEXT_ESTIMATE_INSTRUCTION,
  type EstimateResult,
} from "@/lib/food/estimate";
import { clampServing } from "@/lib/food/macros";
import { inferMealSlot } from "@/lib/food/slots";
import type { LoggedMeal, MealSlot, RecipeIngredient } from "@/lib/types";

export type ActionError = { error: string };

function revalidateFoodViews() {
  revalidatePath("/log-food");
  revalidatePath("/");
  revalidatePath("/metrics");
  revalidatePath("/guidance");
}

export type NewFoodInput = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  default_serving: number;
  serving_unit: string;
  is_saved: boolean;
};

/**
 * The single place a LoggedMeal row is created. Every logging path in the app
 * goes through here, so slot inference and serving rules live in one function.
 * Omitting `meal_slot` infers it from the current local time.
 */
export async function createLoggedMeal(input: {
  food_id: string;
  serving?: number;
  meal_slot?: MealSlot;
  eaten_at?: string;
}): Promise<{ meal: LoggedMeal } | ActionError> {
  const { supabase } = await requireUser();

  const serving = Number(input.serving ?? 1);
  if (!Number.isFinite(serving) || serving <= 0) {
    return { error: "Serving must be above zero." };
  }

  const meal_slot = input.meal_slot ?? inferMealSlot(await getTimeZone());

  const { data, error } = await supabase
    .from("logged_meals")
    .insert({
      food_id: input.food_id,
      serving,
      meal_slot,
      ...(input.eaten_at ? { eaten_at: input.eaten_at } : {}),
    })
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? "Could not log this food." };

  // The protein habit auto-marks the moment the day's total crosses the floor.
  await checkProteinHabit();
  revalidateFoodViews();
  return { meal: data };
}

export async function updateMealServing(
  id: string,
  serving: number,
): Promise<ActionError | { ok: true }> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("logged_meals")
    .update({ serving: clampServing(serving) })
    .eq("id", id);
  if (error) return { error: error.message };
  await checkProteinHabit();
  revalidateFoodViews();
  return { ok: true };
}

export async function updateMealSlot(
  id: string,
  meal_slot: MealSlot,
): Promise<ActionError | { ok: true }> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("logged_meals")
    .update({ meal_slot })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateFoodViews();
  return { ok: true };
}

export async function deleteLoggedMeal(id: string): Promise<ActionError | { ok: true }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("logged_meals").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateFoodViews();
  return { ok: true };
}

/**
 * Creates the Food, then logs it. Used by the new food form and by every
 * estimate path, since logged_meals.food_id needs a real row to point at;
 * `is_saved` is what decides whether the food stays in the library.
 */
export async function createFoodAndLog(
  food: NewFoodInput,
  meal: { serving: number; meal_slot?: MealSlot },
): Promise<ActionError | void> {
  const { supabase } = await requireUser();

  const name = food.name.trim();
  if (!name) return { error: "Name is required." };

  const { data, error } = await supabase
    .from("foods")
    .insert({
      name,
      calories: Math.max(0, food.calories),
      protein_g: Math.max(0, food.protein_g),
      carbs_g: Math.max(0, food.carbs_g),
      fat_g: Math.max(0, food.fat_g),
      default_serving: Math.max(0.25, food.default_serving),
      serving_unit: food.serving_unit.trim() || "serving",
      is_saved: food.is_saved,
    })
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? "Could not save this food." };

  const logged = await createLoggedMeal({
    food_id: data.id,
    serving: meal.serving,
    meal_slot: meal.meal_slot,
  });

  if ("error" in logged) return logged;

  redirect("/log-food");
}

export async function estimateMealFromText(text: string): Promise<EstimateResult> {
  await requireUser();

  const described = text.trim();
  if (!described) return { error: "Describe the meal first." };

  return requestFoodEstimate(
    [{ type: "text", text: described }],
    TEXT_ESTIMATE_INSTRUCTION,
  );
}

export async function saveRecipe(input: {
  id: string | null;
  name: string;
  ingredients: RecipeIngredient[];
}): Promise<ActionError | void> {
  const { supabase } = await requireUser();

  const name = input.name.trim();
  if (!name) return { error: "Name is required." };

  const ingredients = input.ingredients
    .filter((row) => row.food_id)
    .map((row) => ({ food_id: row.food_id, quantity: Math.max(0.25, row.quantity) }));

  if (ingredients.length === 0) return { error: "Add at least one ingredient." };

  const { error } = input.id
    ? await supabase.from("recipes").update({ name, ingredients }).eq("id", input.id)
    : await supabase.from("recipes").insert({ name, ingredients });

  if (error) return { error: error.message };

  revalidatePath("/log-food/recipes");
  redirect("/log-food/recipes");
}

export async function deleteRecipe(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("recipes").delete().eq("id", id);
  revalidatePath("/log-food/recipes");
  redirect("/log-food/recipes");
}

/**
 * One LoggedMeal per ingredient, all in the same slot. Ingredients stay
 * separate rows so each food keeps its own history.
 */
export async function logRecipe(id: string): Promise<ActionError | void> {
  const { supabase } = await requireUser();

  const { data: recipe } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
  if (!recipe) return { error: "Recipe not found." };
  if (recipe.ingredients.length === 0) return { error: "Recipe has no ingredients." };

  const meal_slot = inferMealSlot(await getTimeZone());

  for (const ingredient of recipe.ingredients) {
    const logged = await createLoggedMeal({
      food_id: ingredient.food_id,
      serving: ingredient.quantity,
      meal_slot,
    });
    if ("error" in logged) return logged;
  }

  redirect("/log-food");
}
