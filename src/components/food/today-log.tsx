"use client";

import { useTransition } from "react";

import { SectionLabel } from "@/components/ui";
import { deleteLoggedMeal, updateMealServing, updateMealSlot } from "@/lib/food/actions";
import type { MealRow } from "@/lib/food/data";
import { scaleFood, SERVING_STEP, sumFoodQuantities } from "@/lib/food/macros";
import { formatMealSlot } from "@/lib/food/slots";
import { formatNumber } from "@/lib/format";
import { MEAL_SLOTS, type MealSlot } from "@/lib/types";

export function TodayLog({ rows }: { rows: MealRow[] }) {
  const [pending, startTransition] = useTransition();

  if (rows.length === 0) {
    return <p className="text-fg-dim text-sm">Nothing logged today.</p>;
  }

  const groups = MEAL_SLOTS.map((slot) => ({
    slot,
    rows: rows.filter((row) => row.meal.meal_slot === slot),
  })).filter((group) => group.rows.length > 0);

  function step(row: MealRow, direction: -1 | 1) {
    startTransition(async () => {
      await updateMealServing(row.meal.id, row.meal.serving + direction * SERVING_STEP);
    });
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const total = sumFoodQuantities(
          group.rows.map((row) => ({ food: row.food, quantity: row.meal.serving })),
        );

        return (
          <div key={group.slot}>
            <div className="flex items-baseline justify-between">
              <SectionLabel>{formatMealSlot(group.slot)}</SectionLabel>
              <span className="text-fg-dim num text-xs">
                {formatNumber(total.calories)} kcal
              </span>
            </div>

            <ul className="divide-border mt-1 divide-y">
              {group.rows.map((row) => (
                <li key={row.meal.id} className="py-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm leading-tight">{row.food.name}</span>
                    <span className="num shrink-0 text-sm">
                      {formatNumber(scaleFood(row.food, row.meal.serving).calories)} kcal
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1.5">
                    <StepButton
                      label="Less"
                      glyph={"\u2212"}
                      disabled={pending || row.meal.serving <= SERVING_STEP}
                      onClick={() => step(row, -1)}
                    />
                    <span className="num w-14 text-center text-xs">
                      {"\u00d7"} {formatNumber(row.meal.serving)}
                    </span>
                    <StepButton
                      label="More"
                      glyph="+"
                      disabled={pending}
                      onClick={() => step(row, 1)}
                    />

                    <select
                      value={row.meal.meal_slot}
                      aria-label="Meal"
                      disabled={pending}
                      onChange={(event) =>
                        startTransition(async () => {
                          await updateMealSlot(row.meal.id, event.target.value as MealSlot);
                        })
                      }
                      className="border-border bg-surface-raised text-fg-dim focus:border-accent ml-auto rounded border px-1.5 py-1 text-xs outline-none"
                    >
                      {MEAL_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {formatMealSlot(slot)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      aria-label="Delete"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteLoggedMeal(row.meal.id);
                        })
                      }
                      className="text-fg-dim hover:text-status-red size-7 shrink-0 rounded-md leading-none disabled:opacity-40"
                    >
                      {"\u00d7"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function StepButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="border-border text-fg-dim hover:text-fg size-7 shrink-0 rounded-md border text-sm leading-none disabled:opacity-30"
    >
      {glyph}
    </button>
  );
}
