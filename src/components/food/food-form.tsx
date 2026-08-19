"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import { Button, NumberField, Panel, TextField } from "@/components/ui";
import { createFoodAndLog } from "@/lib/food/actions";
import type { FoodEstimate } from "@/lib/food/estimate";
import { formatMealSlot } from "@/lib/food/slots";
import { MEAL_SLOTS, type MealSlot } from "@/lib/types";

type FieldName =
  | "name"
  | "calories"
  | "protein_g"
  | "carbs_g"
  | "fat_g"
  | "default_serving"
  | "serving_unit";

/** Held as strings so the fields stay editable while typing. */
type Fields = Record<FieldName, string>;

function initialFields(initial?: Partial<FoodEstimate>): Fields {
  const round = (value: number | undefined) =>
    value === undefined ? "" : String(Math.round(value * 100) / 100);

  return {
    name: initial?.name ?? "",
    calories: round(initial?.calories),
    protein_g: round(initial?.protein_g),
    carbs_g: round(initial?.carbs_g),
    fat_g: round(initial?.fat_g),
    default_serving: round(initial?.default_serving) || "1",
    serving_unit: initial?.serving_unit ?? "serving",
  };
}

/**
 * The one confirm-or-edit screen. Every path that produces a Food ends here,
 * whether the numbers were typed or estimated, and saving writes the Food and
 * its LoggedMeal together.
 */
export function FoodForm({
  initial,
  defaultSaved = false,
  defaultSlot,
  submitLabel,
}: {
  initial?: Partial<FoodEstimate>;
  defaultSaved?: boolean;
  defaultSlot: MealSlot;
  submitLabel: string;
}) {
  const [fields, setFields] = useState<Fields>(() => initialFields(initial));
  const [isSaved, setIsSaved] = useState(defaultSaved);
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set(field: FieldName, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!fields.name.trim()) {
      setError("Name is required.");
      return;
    }

    const serving = Number(fields.default_serving) || 1;

    startTransition(async () => {
      const result = await createFoodAndLog(
        {
          name: fields.name,
          calories: Number(fields.calories) || 0,
          protein_g: Number(fields.protein_g) || 0,
          carbs_g: Number(fields.carbs_g) || 0,
          fat_g: Number(fields.fat_g) || 0,
          default_serving: serving,
          serving_unit: fields.serving_unit,
          is_saved: isSaved,
        },
        { serving, meal_slot: slot },
      );

      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Panel className="space-y-3">
        <Field label="Name">
          <TextField
            value={fields.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder="Greek yogurt"
          />
        </Field>

        <p className="text-fg-dim text-[11px]">Macros are per one serving.</p>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Calories">
            <NumberField
              value={fields.calories}
              onChange={(event) => set("calories", event.target.value)}
            />
          </Field>
          <Field label="Protein g">
            <NumberField
              value={fields.protein_g}
              onChange={(event) => set("protein_g", event.target.value)}
            />
          </Field>
          <Field label="Carbs g">
            <NumberField
              value={fields.carbs_g}
              onChange={(event) => set("carbs_g", event.target.value)}
            />
          </Field>
          <Field label="Fat g">
            <NumberField
              value={fields.fat_g}
              onChange={(event) => set("fat_g", event.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Servings">
            <NumberField
              value={fields.default_serving}
              onChange={(event) => set("default_serving", event.target.value)}
            />
          </Field>
          <Field label="Serving unit">
            <TextField
              value={fields.serving_unit}
              onChange={(event) => set("serving_unit", event.target.value)}
              placeholder="cup"
            />
          </Field>
        </div>

        <Field label="Meal">
          <select
            value={slot}
            onChange={(event) => setSlot(event.target.value as MealSlot)}
            className="border-border bg-surface-raised text-fg focus:border-accent w-full rounded-md border px-2 py-1.5 text-sm outline-none"
          >
            {MEAL_SLOTS.map((option) => (
              <option key={option} value={option}>
                {formatMealSlot(option)}
              </option>
            ))}
          </select>
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isSaved}
            onChange={(event) => setIsSaved(event.target.checked)}
            className="accent-accent size-4"
          />
          Keep in library
        </label>
      </Panel>

      {error ? <p className="text-status-red text-xs">{error}</p> : null}

      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-fg-dim mb-1 block text-[11px]">{label}</span>
      {children}
    </label>
  );
}
