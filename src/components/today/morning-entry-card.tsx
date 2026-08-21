"use client";

/**
 * The morning entry: sleep hours, subjective quality, optional bed time, and
 * time available today. One write per day, editable after. Optimistic: the
 * card collapses to its summary immediately and reopens on failure.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useToast } from "@/components/toast";
import { Button, NumberField, SectionLabel } from "@/components/ui";
import { call } from "@/lib/client/call";
import { saveMorningEntry, type MorningEntryInput } from "@/lib/ergos/actions";
import { formatNumber } from "@/lib/format";
import type { MorningEntry } from "@/lib/types";

export function MorningEntryCard({
  entry,
  defaultTimeAvailable,
}: {
  entry: MorningEntry | null;
  defaultTimeAvailable: number;
}) {
  const router = useRouter();
  const { fail, toast } = useToast();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(entry === null);
  const [optimistic, setOptimistic] = useState<MorningEntryInput | null>(null);

  const shown = optimistic ?? (entry
    ? {
        sleep_hours: Number(entry.sleep_hours),
        sleep_quality: entry.sleep_quality,
        bed_time: entry.bed_time?.slice(0, 5) ?? null,
        time_available_min: entry.time_available_min,
      }
    : null);

  function submit(formData: FormData) {
    const input: MorningEntryInput = {
      sleep_hours: Number(formData.get("sleep_hours")),
      sleep_quality: Number(formData.get("sleep_quality")),
      bed_time: String(formData.get("bed_time") || "") || null,
      time_available_min: formData.get("time_available_min")
        ? Number(formData.get("time_available_min"))
        : null,
    };
    setOptimistic(input);
    setEditing(false);
    startTransition(async () => {
      const result = await call(saveMorningEntry(input));
      if ("error" in result) {
        setOptimistic(null);
        setEditing(true);
        fail(`Morning entry not saved: ${result.error}`, () => submit(formData));
        return;
      }
      toast("Morning entry saved");
      router.refresh();
    });
  }

  if (!editing && shown) {
    return (
      <section className="border-border bg-surface rounded-card border p-4">
        <div className="flex items-center justify-between">
          <SectionLabel>Morning entry</SectionLabel>
          <Button variant="quiet" className="px-2 py-1" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
        <p className="mt-2 text-sm">
          <span className="num text-text-hi">{formatNumber(shown.sleep_hours)} h</span>
          <span className="text-text-mid"> sleep, quality </span>
          <span className="num text-text-hi">{shown.sleep_quality}/10</span>
          {shown.bed_time && (
            <>
              <span className="text-text-mid">, bed </span>
              <span className="num text-text-hi">{shown.bed_time}</span>
            </>
          )}
          <span className="text-text-mid">, </span>
          <span className="num text-text-hi">
            {shown.time_available_min ?? defaultTimeAvailable} min
          </span>
          <span className="text-text-mid"> available</span>
        </p>
      </section>
    );
  }

  return (
    <section className="border-border bg-surface rounded-card border p-4">
      <SectionLabel>Morning entry</SectionLabel>
      <form action={submit}>
        <div className="mt-3 grid max-w-[440px] grid-cols-2 gap-3">
          <label className="block min-w-0">
            <span className="text-text-mid text-xs">Sleep hours</span>
            <NumberField
              name="sleep_hours"
              step="0.1"
              min="0"
              max="24"
              required
              defaultValue={shown?.sleep_hours ?? ""}
              placeholder="7.5"
              className="!text-left"
              shellClassName="mt-1"
            />
          </label>
          <label className="block min-w-0">
            <span className="text-text-mid text-xs">Quality 1-10</span>
            <NumberField
              name="sleep_quality"
              step="1"
              min="1"
              max="10"
              required
              defaultValue={shown?.sleep_quality ?? ""}
              placeholder="7"
              className="!text-left"
              shellClassName="mt-1"
            />
          </label>
          <label className="block min-w-0">
            <span className="text-text-mid text-xs">Bed time</span>
            <input
              type="time"
              name="bed_time"
              defaultValue={shown?.bed_time ?? ""}
              className="num border-border bg-surface text-text-hi rounded-control mt-1 w-full border px-3 py-2 text-left text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </label>
          <label className="block min-w-0">
            <span className="text-text-mid text-xs">Minutes available</span>
            <NumberField
              name="time_available_min"
              step="5"
              min="5"
              defaultValue={shown?.time_available_min ?? defaultTimeAvailable}
              className="!text-left"
              shellClassName="mt-1"
            />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <Button type="submit" variant="primary">
            Save entry
          </Button>
          {entry && (
            <Button type="button" variant="quiet" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
