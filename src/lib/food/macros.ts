import type { Food } from "@/lib/types";

export type MacroTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export const EMPTY_MACROS: MacroTotals = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
};

/** Servings are adjusted in quarters everywhere they appear. */
export const SERVING_STEP = 0.25;

type MacroSource = Pick<Food, "calories" | "protein_g" | "carbs_g" | "fat_g">;

/**
 * A Food stores macros per one serving, so every total in the app is the food's
 * numbers times a quantity. This is the only place that multiplication happens.
 */
export function scaleFood(food: MacroSource, quantity: number): MacroTotals {
  return {
    calories: food.calories * quantity,
    protein_g: food.protein_g * quantity,
    carbs_g: food.carbs_g * quantity,
    fat_g: food.fat_g * quantity,
  };
}

export function addMacros(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: a.calories + b.calories,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
  };
}

export function sumFoodQuantities(
  items: Array<{ food: MacroSource; quantity: number }>,
): MacroTotals {
  return items.reduce(
    (total, item) => addMacros(total, scaleFood(item.food, item.quantity)),
    EMPTY_MACROS,
  );
}

/** Rounds to the nearest quarter serving, never below one step. */
export function clampServing(serving: number): number {
  if (!Number.isFinite(serving)) return SERVING_STEP;
  return Math.max(SERVING_STEP, Math.round(serving / SERVING_STEP) * SERVING_STEP);
}
