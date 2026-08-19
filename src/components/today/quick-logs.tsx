"use client";

import { useState } from "react";

import { Sheet } from "@/components/sheet";
import { Button, Meter, NumberField, SECTION_LABEL_CLASS } from "@/components/ui";
import { addWater, logBodyweight } from "@/lib/actions";
import { formatNumber } from "@/lib/format";

export function WaterControl({ current, target }: { current: number; target: number }) {
  return (
    <form action={addWater} className="border-border bg-surface rounded-lg border p-3">
      <button type="submit" className="mb-2 flex w-full items-baseline justify-between gap-2">
        <span className={SECTION_LABEL_CLASS}>Water</span>
        <span className="num text-fg text-sm">
          {formatNumber(current)} / {formatNumber(target)}
        </span>
      </button>
      <Meter value={current} max={target} />
      <p className="text-fg-dim mt-2 text-[11px]">Tap to add</p>
    </form>
  );
}

/**
 * The bodyweight entry point itself, with no card around it. Today wraps it in
 * a quick-log tile and the progress tab drops it under the weight graph; both
 * write through the same action.
 */
export function LogWeightButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" className={className} onClick={() => setOpen(true)}>
        Log weight
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Log weight">
        <form
          action={async (formData) => {
            await logBodyweight(formData);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <label className="flex items-center justify-between gap-3">
            <span className="text-fg-dim text-sm">Pounds</span>
            <NumberField name="weight_lb" required autoFocus className="max-w-32" />
          </label>
          <Button type="submit" variant="primary" className="w-full">
            Save
          </Button>
        </form>
      </Sheet>
    </>
  );
}

export function LogWeight() {
  return (
    <div className="border-border bg-surface flex flex-col justify-between rounded-lg border p-3">
      <span className={SECTION_LABEL_CLASS}>Bodyweight</span>
      <LogWeightButton className="mt-2 w-full" />
    </div>
  );
}
