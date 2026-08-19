"use client";

import { useState } from "react";

import { Sheet } from "@/components/sheet";
import { Button, GearIcon, NumberField } from "@/components/ui";
import { setMacroTargets } from "@/lib/actions";
import type { DailyMacroTarget } from "@/lib/types";

const FIELDS = [
  { name: "calories", label: "Calories" },
  { name: "protein_g", label: "Protein" },
  { name: "carbs_g", label: "Carbs" },
  { name: "fat_g", label: "Fat" },
] as const;

export function TargetsSheet({
  target,
  trigger,
}: {
  target: DailyMacroTarget | null;
  trigger: "gear" | "action";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {trigger === "gear" ? (
        <button
          type="button"
          aria-label="Macro targets"
          onClick={() => setOpen(true)}
          className="text-fg-dim hover:text-fg p-1"
        >
          <GearIcon />
        </button>
      ) : (
        <Button variant="primary" className="w-full" onClick={() => setOpen(true)}>
          Set targets
        </Button>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Daily targets">
        <form
          action={async (formData) => {
            await setMacroTargets(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          {FIELDS.map((field) => (
            <label key={field.name} className="flex items-center justify-between gap-3">
              <span className="text-fg-dim text-sm">{field.label}</span>
              <NumberField
                name={field.name}
                required
                defaultValue={target ? String(target[field.name]) : ""}
                className="max-w-32"
              />
            </label>
          ))}

          <Button type="submit" variant="primary" className="w-full">
            Save
          </Button>
        </form>
      </Sheet>
    </>
  );
}
