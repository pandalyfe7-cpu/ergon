"use client";

/**
 * Global quick-add commands (Cmd/Ctrl+J or via the palette): log bodyweight
 * without leaving the screen, jump to food logging, mark a habit done.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { usePaletteCommands, type PaletteCommand } from "@/components/palette";
import { useToast } from "@/components/toast";
import { Button, NumberField } from "@/components/ui";
import { call } from "@/lib/client/call";
import { logBodyweight, markHabit } from "@/lib/ergos/actions";

export type QuickHabit = { slug: string; name: string };

export function QuickAdd({ habits }: { habits: QuickHabit[] }) {
  const router = useRouter();
  const { fail, toast } = useToast();
  const [, startTransition] = useTransition();
  const [weightOpen, setWeightOpen] = useState(false);

  const commands = useMemo<PaletteCommand[]>(() => {
    const mark = (habit: QuickHabit) => {
      startTransition(async () => {
        const result = await call(markHabit(habit.slug, "completed"));
        if ("error" in result) {
          fail(`Mark not saved: ${result.error}`, () => mark(habit));
          return;
        }
        toast(`${habit.name} marked done`);
        router.refresh();
      });
    };

    return [
      {
        id: "add-bodyweight",
        label: "Log bodyweight",
        group: "Add",
        keywords: "weight lb scale",
        run: () => setWeightOpen(true),
      },
      {
        id: "add-food",
        label: "Log food",
        group: "Add",
        keywords: "meal protein eat",
        run: () => router.push("/log-food"),
      },
      ...habits.map((habit) => ({
        id: `add-habit-${habit.slug}`,
        label: `Mark done: ${habit.name}`,
        group: "Add" as const,
        keywords: "habit",
        run: () => mark(habit),
      })),
    ];
  }, [habits, router, fail, toast]);

  usePaletteCommands(commands);

  function submitWeight(form: HTMLFormElement) {
    const input = form.elements.namedItem("weight") as HTMLInputElement;
    const value = Number(input.value);
    if (!Number.isFinite(value) || value <= 0) return;
    setWeightOpen(false);
    const save = () =>
      startTransition(async () => {
        const result = await call(logBodyweight(value));
        if ("error" in result) {
          fail(`Weight not saved: ${result.error}`, save);
          return;
        }
        toast(`Bodyweight ${value} lb logged`);
        router.refresh();
      });
    save();
  }

  if (!weightOpen) return null;

  return (
    <div
      className="bg-bg/60 fixed inset-0 z-50"
      role="presentation"
      onClick={() => setWeightOpen(false)}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Log bodyweight"
        className="palette-in bg-surface-2 border-border shadow-overlay rounded-card mx-auto mt-[10vh] flex w-[calc(100%-32px)] max-w-xs items-end gap-3 border p-4"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          submitWeight(event.currentTarget);
        }}
      >
        <label className="block grow">
          <span className="text-text-low text-xs">Bodyweight, lb</span>
          <NumberField
            autoFocus
            name="weight"
            className="mt-1 w-full"
            step="0.1"
            min="50"
            max="500"
            onKeyDown={(event) => {
              if (event.key === "Escape") setWeightOpen(false);
            }}
          />
        </label>
        <Button type="submit" variant="primary">
          Log
        </Button>
      </form>
    </div>
  );
}
