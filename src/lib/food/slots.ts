import type { MealSlot } from "@/lib/types";

/** Boundaries are local-hour cutoffs, evaluated in the user's time zone. */
export function inferMealSlot(timeZone: string, now: Date = new Date()): MealSlot {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );

  if (!Number.isFinite(hour)) return "snack";
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

export function formatMealSlot(slot: MealSlot): string {
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}
