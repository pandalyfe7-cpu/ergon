"use client";

import { useState, useTransition, type FormEvent } from "react";

import { FoodForm } from "@/components/food/food-form";
import { Button, FIELD_CLASS, Panel } from "@/components/ui";
import { estimateMealFromText } from "@/lib/food/actions";
import type { FoodEstimate } from "@/lib/food/estimate";
import type { MealSlot } from "@/lib/types";

export function DescribeMeal({ defaultSlot }: { defaultSlot: MealSlot }) {
  const [description, setDescription] = useState("");
  const [estimate, setEstimate] = useState<FoodEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await estimateMealFromText(description);
      if ("error" in result) {
        setEstimate(null);
        setError(result.error);
      } else {
        setEstimate(result.estimate);
      }
    });
  }

  if (estimate) {
    return (
      <div className="space-y-3">
        <p className="text-fg-dim text-xs">Estimated. Check the numbers before logging.</p>
        <FoodForm initial={estimate} defaultSlot={defaultSlot} submitLabel="Log meal" />
        <Button
          variant="quiet"
          className="w-full"
          onClick={() => {
            setEstimate(null);
            setError(null);
          }}
        >
          Start over
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Panel>
        <textarea
          rows={3}
          value={description}
          aria-label="Meal description"
          placeholder="two eggs and toast"
          onChange={(event) => setDescription(event.target.value)}
          className={`${FIELD_CLASS} resize-none text-sm`}
        />
      </Panel>

      {error ? <p className="text-status-red text-xs">{error}</p> : null}

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={pending || !description.trim()}
      >
        {pending ? "Estimating" : "Estimate"}
      </Button>
    </form>
  );
}
