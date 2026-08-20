"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button, Card } from "@/components/ui";
import { logRecipe } from "@/lib/food/actions";
import { sumFoodQuantities } from "@/lib/food/macros";
import { formatNumber } from "@/lib/format";
import type { Food, Recipe } from "@/lib/types";

export function RecipeList({ recipes, foods }: { recipes: Recipe[]; foods: Food[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (recipes.length === 0) {
    return (
      <Card>
        <p className="text-text-mid text-sm">
          No recipes yet. A recipe logs each ingredient separately.
        </p>
      </Card>
    );
  }

  const byId = new Map<string, Food>(foods.map((food) => [food.id, food]));

  return (
    <div className="space-y-3">
      {error ? <p className="text-negative text-xs">{error}</p> : null}

      {recipes.map((recipe) => {
        const items = recipe.ingredients.flatMap((ingredient) => {
          const food = byId.get(ingredient.food_id);
          return food ? [{ food, quantity: ingredient.quantity }] : [];
        });
        const totals = sumFoodQuantities(items);

        return (
          <Card key={recipe.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/log-food/recipes/${recipe.id}`} className="min-w-0">
                <span className="block text-sm font-medium leading-tight">{recipe.name}</span>
                <span className="text-text-mid num mt-1 block text-xs">
                  {items.length} items {"\u00b7"} {formatNumber(totals.calories)} kcal
                </span>
              </Link>

              <Button
                variant="primary"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await logRecipe(recipe.id);
                    if (result && "error" in result) setError(result.error);
                  });
                }}
              >
                Log
              </Button>
            </div>

            <p className="text-text-mid num text-[11px]">
              P {formatNumber(totals.protein_g)} {"\u00b7"} C {formatNumber(totals.carbs_g)}{" "}
              {"\u00b7"} F {formatNumber(totals.fat_g)}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
