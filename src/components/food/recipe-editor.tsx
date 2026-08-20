"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  Button,
  NumberField,
  Panel,
  SectionLabel,
  Select,
  TextField,
} from "@/components/ui";
import { deleteRecipe, saveRecipe } from "@/lib/food/actions";
import { sumFoodQuantities } from "@/lib/food/macros";
import { formatNumber } from "@/lib/format";
import type { Food, Recipe } from "@/lib/types";

/** Numbers are held as strings so the fields stay editable while typing. */
type Row = { key: string; food_id: string; quantity: string };

export function RecipeEditor({ recipe, foods }: { recipe: Recipe | null; foods: Food[] }) {
  const [name, setName] = useState(recipe?.name ?? "");
  const [rows, setRows] = useState<Row[]>(
    () =>
      recipe?.ingredients.map((ingredient, index) => ({
        key: `row-${index}`,
        food_id: ingredient.food_id,
        quantity: String(ingredient.quantity),
      })) ?? [],
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (foods.length === 0) {
    return (
      <Panel>
        <p className="text-text-mid text-sm">
          No foods yet. A recipe is built from the library.
        </p>
        <Link href="/log-food/new" className="text-accent mt-2 inline-block text-sm underline">
          New food
        </Link>
      </Panel>
    );
  }

  const byId = new Map<string, Food>(foods.map((food) => [food.id, food]));
  const totals = sumFoodQuantities(
    rows.flatMap((row) => {
      const food = byId.get(row.food_id);
      const quantity = Number(row.quantity);
      return food && Number.isFinite(quantity) ? [{ food, quantity }] : [];
    }),
  );

  function update(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { key: `row-${Date.now()}`, food_id: foods[0].id, quantity: "1" },
    ]);
  }

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    startTransition(async () => {
      const result = await saveRecipe({
        id: recipe?.id ?? null,
        name,
        ingredients: rows.map((row) => ({
          food_id: row.food_id,
          quantity: Number(row.quantity) || 1,
        })),
      });
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <Panel>
        <SectionLabel>Name</SectionLabel>
        <TextField
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Chili"
          className="mt-2"
        />
      </Panel>

      <Panel>
        <SectionLabel>Ingredients</SectionLabel>

        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.key} className="border-border bg-surface-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Select
                  value={row.food_id}
                  aria-label="Food"
                  onChange={(event) => update(row.key, { food_id: event.target.value })}
                >
                  {foods.map((food) => (
                    <option key={food.id} value={food.id}>
                      {food.name}
                    </option>
                  ))}
                </Select>

                <NumberField
                  value={row.quantity}
                  aria-label="Servings"
                  onChange={(event) => update(row.key, { quantity: event.target.value })}
                  className="w-16 shrink-0"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setRows((current) => current.filter((item) => item.key !== row.key))
                }
                className="text-text-mid hover:text-text-hi mt-2 text-xs"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={addRow}
          className="border-border text-text-mid hover:text-text-hi hover:border-accent/40 mt-2 w-full rounded-md border border-dashed py-2 text-xs"
        >
          Add ingredient
        </button>
      </Panel>

      <Panel>
        <SectionLabel>Totals</SectionLabel>
        <p className="num mt-2 text-2xl">{formatNumber(totals.calories)}</p>
        <p className="text-text-mid num mt-1 text-xs">
          P {formatNumber(totals.protein_g)} {"\u00b7"} C {formatNumber(totals.carbs_g)}{" "}
          {"\u00b7"} F {formatNumber(totals.fat_g)}
        </p>
      </Panel>

      {error ? <p className="text-negative text-xs">{error}</p> : null}

      <Button variant="primary" className="w-full" disabled={pending} onClick={submit}>
        Save
      </Button>

      {recipe ? (
        <Button
          variant="quiet"
          className={`w-full ${confirmingDelete ? "text-negative" : ""}`}
          disabled={pending}
          onClick={() => {
            if (!confirmingDelete) {
              setConfirmingDelete(true);
              return;
            }
            startTransition(async () => {
              await deleteRecipe(recipe.id);
            });
          }}
        >
          {confirmingDelete ? "Confirm delete" : "Delete"}
        </Button>
      ) : null}
    </div>
  );
}
