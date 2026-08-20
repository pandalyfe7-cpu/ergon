"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useToast } from "@/components/toast";
import { SectionLabel } from "@/components/ui";
import { call } from "@/lib/client/call";
import { deleteLoggedMeal, updateMealServing, updateMealSlot } from "@/lib/food/actions";
import type { MealRow } from "@/lib/food/data";
import { scaleFood, SERVING_STEP, sumFoodQuantities } from "@/lib/food/macros";
import { formatMealSlot } from "@/lib/food/slots";
import { formatNumber } from "@/lib/format";
import { MEAL_SLOTS, type MealSlot } from "@/lib/types";

export function TodayLog({ rows: serverRows }: { rows: MealRow[] }) {
  const router = useRouter();
  const { fail, toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(serverRows);

  // Server refreshes replace the optimistic list.
  const [lastServerRows, setLastServerRows] = useState(serverRows);
  if (lastServerRows !== serverRows) {
    setLastServerRows(serverRows);
    setRows(serverRows);
  }

  function patchRow(id: string, patch: Partial<MealRow["meal"]>) {
    setRows((current) =>
      current.map((row) =>
        row.meal.id === id ? { ...row, meal: { ...row.meal, ...patch } } : row,
      ),
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-text-mid text-sm">
        Nothing logged today. Tap a recent food above or search for one.
      </p>
    );
  }

  const groups = MEAL_SLOTS.map((slot) => ({
    slot,
    rows: rows.filter((row) => row.meal.meal_slot === slot),
  })).filter((group) => group.rows.length > 0);

  function step(row: MealRow, direction: -1 | 1) {
    const next = row.meal.serving + direction * SERVING_STEP;
    patchRow(row.meal.id, { serving: next });
    startTransition(async () => {
      const result = await call(updateMealServing(row.meal.id, next));
      if ("error" in result) {
        patchRow(row.meal.id, { serving: row.meal.serving });
        fail(`Serving not saved: ${result.error}`, () => step(row, direction));
        return;
      }
      router.refresh();
    });
  }

  function move(row: MealRow, slot: MealSlot) {
    const previous = row.meal.meal_slot;
    patchRow(row.meal.id, { meal_slot: slot });
    startTransition(async () => {
      const result = await call(updateMealSlot(row.meal.id, slot));
      if ("error" in result) {
        patchRow(row.meal.id, { meal_slot: previous });
        fail(`Meal not moved: ${result.error}`, () => move(row, slot));
        return;
      }
      router.refresh();
    });
  }

  function remove(row: MealRow) {
    setRows((current) => current.filter((r) => r.meal.id !== row.meal.id));
    startTransition(async () => {
      const result = await call(deleteLoggedMeal(row.meal.id));
      if ("error" in result) {
        setRows((current) => [...current, row]);
        fail(`Not deleted: ${result.error}`, () => remove(row));
        return;
      }
      toast(`${row.food.name} removed`);
      router.refresh();
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
              <span className="text-text-low num text-xs">
                {formatNumber(total.protein_g)} g P · {formatNumber(total.calories)} kcal
              </span>
            </div>

            <ul className="divide-border mt-1 divide-y">
              {group.rows.map((row) => {
                const scaled = scaleFood(row.food, row.meal.serving);
                return (
                  <li key={row.meal.id} className="py-2">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-text-hi text-sm leading-tight">
                        {row.food.name}
                      </span>
                      <span className="num text-text-mid shrink-0 text-xs">
                        {formatNumber(scaled.protein_g)} g P ·{" "}
                        {formatNumber(scaled.calories)} kcal
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-1.5">
                      <StepButton
                        label={`Less ${row.food.name}`}
                        glyph={"\u2212"}
                        disabled={pending || row.meal.serving <= SERVING_STEP}
                        onClick={() => step(row, -1)}
                      />
                      <span className="num text-text-mid w-14 text-center text-xs">
                        {"\u00d7"} {formatNumber(row.meal.serving, 2)}
                      </span>
                      <StepButton
                        label={`More ${row.food.name}`}
                        glyph="+"
                        disabled={pending}
                        onClick={() => step(row, 1)}
                      />

                      <select
                        value={row.meal.meal_slot}
                        aria-label={`Meal slot for ${row.food.name}`}
                        disabled={pending}
                        onChange={(event) => move(row, event.target.value as MealSlot)}
                        className="border-border bg-surface-2 text-text-mid rounded-control focus-visible:outline-accent ml-auto border px-1.5 py-1 text-xs"
                      >
                        {MEAL_SLOTS.map((slot) => (
                          <option key={slot} value={slot}>
                            {formatMealSlot(slot)}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        aria-label={`Delete ${row.food.name}`}
                        disabled={pending}
                        onClick={() => remove(row)}
                        className="text-text-low hover:text-negative size-7 shrink-0 rounded-md leading-none disabled:opacity-40"
                      >
                        {"\u00d7"}
                      </button>
                    </div>
                  </li>
                );
              })}
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
      className="border-border text-text-mid hover:text-text-hi rounded-control size-7 shrink-0 border text-sm leading-none disabled:opacity-30"
    >
      {glyph}
    </button>
  );
}
