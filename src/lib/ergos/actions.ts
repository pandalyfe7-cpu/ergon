"use server";

/**
 * ERGOS write paths. Every action validates its input, returns { error } on
 * failure (the client owns optimistic UI and retry), and revalidates the
 * screens whose data it moves. Recommendations refresh on the next load
 * because every screen that shows them calls refreshRecommendations.
 */

import { revalidatePath } from "next/cache";

import { getErgosContext } from "@/lib/ergos/data";
import { sumFoodQuantities } from "@/lib/food/macros";
import { dayWindow } from "@/lib/time";
import {
  DISMISS_REASONS,
  HABIT_STATES,
  type DismissReason,
  type Food,
  type HabitState,
  type MetricTarget,
} from "@/lib/types";

const ALL_SCREENS = ["/", "/guidance", "/metrics", "/habits", "/history"];

function revalidateScreens() {
  for (const path of ALL_SCREENS) revalidatePath(path);
}

// Quick add ------------------------------------------------------------------------

export async function logBodyweight(
  weightLb: number,
): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();
  if (!Number.isFinite(weightLb) || weightLb < 50 || weightLb > 500) {
    return { error: "Weight must be between 50 and 500 lb." };
  }
  const { error } = await ctx.supabase
    .from("bodyweight_logs")
    .insert({ weight_lb: weightLb });
  if (error) return { error: error.message };
  revalidateScreens();
  revalidatePath("/settings");
  return { ok: true };
}

// Morning entry -----------------------------------------------------------------

export type MorningEntryInput = {
  sleep_hours: number;
  sleep_quality: number;
  bed_time: string | null;
  time_available_min: number | null;
};

export async function saveMorningEntry(
  input: MorningEntryInput,
): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();

  if (!Number.isFinite(input.sleep_hours) || input.sleep_hours < 0 || input.sleep_hours > 24) {
    return { error: "Sleep hours must be between 0 and 24." };
  }
  const quality = Math.trunc(input.sleep_quality);
  if (!Number.isFinite(quality) || quality < 1 || quality > 10) {
    return { error: "Sleep quality must be 1 to 10." };
  }
  if (input.bed_time !== null && !/^\d{2}:\d{2}$/.test(input.bed_time)) {
    return { error: "Bed time must be HH:MM." };
  }
  if (
    input.time_available_min !== null &&
    (!Number.isFinite(input.time_available_min) || input.time_available_min <= 0)
  ) {
    return { error: "Time available must be a positive number of minutes." };
  }

  const values = {
    entry_date: ctx.today,
    sleep_hours: input.sleep_hours,
    sleep_quality: quality,
    bed_time: input.bed_time,
    time_available_min: input.time_available_min,
  };

  const existing = await ctx.supabase
    .from("morning_entries")
    .select("id")
    .eq("entry_date", ctx.today)
    .maybeSingle();

  const result = existing.data
    ? await ctx.supabase.from("morning_entries").update(values).eq("id", existing.data.id)
    : await ctx.supabase.from("morning_entries").insert(values);

  if (result.error) return { error: result.error.message };

  await autoMarkHabit(ctx.supabase, ctx.today, "morning-entry");

  // Sleep timing: bed time within the configured window of the target.
  if (input.bed_time) {
    const { data: habit } = await ctx.supabase
      .from("habits")
      .select("*")
      .eq("slug", "sleep-timing")
      .maybeSingle();
    const target = habit?.config?.target_bed_time;
    const windowMin = habit?.config?.window_min ?? 30;
    if (habit && target) {
      const toMinutes = (hhmm: string) => {
        const [h, m] = hhmm.split(":").map(Number);
        return h * 60 + m;
      };
      // Distance on a 24h circle, so 23:45 vs 00:10 reads as 25 minutes.
      const raw = Math.abs(toMinutes(input.bed_time) - toMinutes(target.slice(0, 5)));
      const distance = Math.min(raw, 1440 - raw);
      if (distance <= windowMin) {
        await ctx.supabase.from("habit_events").insert({
          habit_id: habit.id,
          event_type: "completed",
          event_date: ctx.today,
          note: `bed ${input.bed_time}, target ${target.slice(0, 5)} ±${windowMin}m`,
        });
      }
    }
  }

  revalidateScreens();
  return { ok: true };
}

// Habits ------------------------------------------------------------------------

type SupabaseClient = Awaited<ReturnType<typeof getErgosContext>>["supabase"];

/** Idempotent: the unique one-mark-per-day index absorbs duplicates. */
async function autoMarkHabit(supabase: SupabaseClient, today: string, slug: string) {
  const { data: habit } = await supabase
    .from("habits")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!habit) return;
  await supabase.from("habit_events").insert({
    habit_id: habit.id,
    event_type: "completed",
    event_date: today,
  });
}

export async function markHabit(
  slug: string,
  kind: "completed" | "floor",
): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();

  const { data: habit } = await ctx.supabase
    .from("habits")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!habit) return { error: "Habit not found." };

  const { error } = await ctx.supabase.from("habit_events").insert({
    habit_id: habit.id,
    event_type: kind,
    event_date: ctx.today,
  });
  // A duplicate mark for the day is success, not failure.
  if (error && !error.message.includes("duplicate")) return { error: error.message };

  // Marking a dormant or recovering habit is a resume signal: three straight
  // days moves recover back to build; any mark wakes dormant into recover.
  if (habit.state === "dormant") {
    await ctx.supabase
      .from("habits")
      .update({ state: "recover", state_changed_at: new Date().toISOString() })
      .eq("id", habit.id);
    await ctx.supabase.from("habit_events").insert({
      habit_id: habit.id,
      event_type: "resumed",
      event_date: ctx.today,
      from_state: "dormant",
      to_state: "recover",
    });
  } else if (habit.state === "recover") {
    const { data: recent } = await ctx.supabase
      .from("habit_events")
      .select("event_date")
      .eq("habit_id", habit.id)
      .in("event_type", ["completed", "floor"])
      .order("event_date", { ascending: false })
      .limit(3);
    const dates = (recent ?? []).map((r) => r.event_date);
    const consecutive =
      dates.length === 3 &&
      new Set(dates).size === 3 &&
      Date.parse(dates[0]) - Date.parse(dates[2]) === 2 * 86_400_000;
    if (consecutive) {
      await ctx.supabase
        .from("habits")
        .update({ state: "build", state_changed_at: new Date().toISOString() })
        .eq("id", habit.id);
      await ctx.supabase.from("habit_events").insert({
        habit_id: habit.id,
        event_type: "state_change",
        event_date: ctx.today,
        from_state: "recover",
        to_state: "build",
        note: "three consecutive marks",
      });
    }
  }

  revalidateScreens();
  return { ok: true };
}

export async function setHabitState(
  slug: string,
  to: HabitState,
): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();
  if (!HABIT_STATES.includes(to)) return { error: "Unknown state." };

  const { data: habit } = await ctx.supabase
    .from("habits")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!habit) return { error: "Habit not found." };
  if (habit.state === to) return { ok: true };

  const { error } = await ctx.supabase
    .from("habits")
    .update({ state: to, state_changed_at: new Date().toISOString() })
    .eq("id", habit.id);
  if (error) return { error: error.message };

  await ctx.supabase.from("habit_events").insert({
    habit_id: habit.id,
    event_type: "state_change",
    event_date: ctx.today,
    from_state: habit.state,
    to_state: to,
    note: "manual",
  });

  revalidateScreens();
  return { ok: true };
}

// Recommendations ------------------------------------------------------------------

export async function actOnRecommendation(
  id: string,
  action: "accepted" | "dismissed" | "snoozed",
  dismissReason?: DismissReason,
): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();

  if (action === "dismissed" && (!dismissReason || !DISMISS_REASONS.includes(dismissReason))) {
    return { error: "Pick a dismissal reason." };
  }

  const values = {
    status: action,
    status_at: new Date().toISOString(),
    dismiss_reason: action === "dismissed" ? dismissReason : null,
    snoozed_until:
      action === "snoozed" ? new Date(Date.now() + 3 * 3_600_000).toISOString() : null,
  };

  const { error } = await ctx.supabase.from("recommendations").update(values).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/guidance");
  revalidatePath("/");
  return { ok: true };
}

// Sessions and rotation ----------------------------------------------------------------

export async function startRotationSession(): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();

  const { data: open } = await ctx.supabase
    .from("sessions")
    .select("id")
    .is("ended_at", null)
    .maybeSingle();
  if (open) return { ok: true };

  const { data: rotation } = await ctx.supabase
    .from("rotation_state")
    .select("position")
    .maybeSingle();
  const { data: template } = await ctx.supabase
    .from("exercise_templates")
    .select("id")
    .eq("rotation_index", rotation?.position ?? 0)
    .maybeSingle();
  if (!template) return { error: "No rotation session is seeded for this position." };

  const { error } = await ctx.supabase
    .from("sessions")
    .insert({ template_id: template.id });
  if (error) return { error: error.message };

  revalidateScreens();
  return { ok: true };
}

export async function finishRotationSession(): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();

  const { data: open } = await ctx.supabase
    .from("sessions")
    .select("*")
    .is("ended_at", null)
    .maybeSingle();
  if (!open) return { error: "No open session." };

  const { data: sets } = await ctx.supabase
    .from("logged_sets")
    .select("id, is_warmup")
    .eq("session_id", open.id);
  const workingCount = (sets ?? []).filter((s) => !s.is_warmup).length;

  const { error } = await ctx.supabase
    .from("sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", open.id);
  if (error) return { error: error.message };

  // Rotation advances only when a rotation session did real work.
  if (open.template_id && workingCount > 0) {
    const { data: template } = await ctx.supabase
      .from("exercise_templates")
      .select("rotation_index")
      .eq("id", open.template_id)
      .maybeSingle();
    if (template?.rotation_index !== null && template?.rotation_index !== undefined) {
      const { data: rotation } = await ctx.supabase
        .from("rotation_state")
        .select("*")
        .maybeSingle();
      if (rotation && rotation.position === template.rotation_index) {
        await ctx.supabase
          .from("rotation_state")
          .update({
            position: (rotation.position + 1) % 6,
            updated_at: new Date().toISOString(),
          })
          .eq("id", rotation.id);
      }
      await autoMarkHabit(ctx.supabase, ctx.today, "training-adherence");
    }
  }

  revalidateScreens();
  return { ok: true };
}

export async function deleteLoggedSet(id: string): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();
  const { error } = await ctx.supabase.from("logged_sets").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateScreens();
  return { ok: true };
}

// Protein auto-mark (called after meal writes) --------------------------------------------

export async function checkProteinHabit(): Promise<void> {
  const ctx = await getErgosContext();
  const { start, end } = dayWindow(ctx.timeZone);

  const { data: def } = await ctx.supabase
    .from("metric_definitions")
    .select("*")
    .eq("slug", "protein")
    .maybeSingle();
  if (!def) return;

  const { data: meals } = await ctx.supabase
    .from("logged_meals")
    .select("*")
    .gte("eaten_at", start.toISOString())
    .lt("eaten_at", end.toISOString());
  if (!meals || meals.length === 0) return;

  const foodIds = [...new Set(meals.map((m) => m.food_id))];
  const { data: foods } = await ctx.supabase.from("foods").select("*").in("id", foodIds);
  const byId = new Map<string, Food>((foods ?? []).map((f) => [f.id, f]));
  const total = sumFoodQuantities(
    meals.flatMap((meal) => {
      const food = byId.get(meal.food_id);
      return food ? [{ food, quantity: meal.serving }] : [];
    }),
  );

  if (total.protein_g >= def.target.floor) {
    await autoMarkHabit(ctx.supabase, ctx.today, "protein-target");
    revalidatePath("/habits");
  }
}

// Settings ---------------------------------------------------------------------------------

export async function updateRotationPosition(
  position: number,
): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();
  const pos = Math.trunc(position);
  if (pos < 0 || pos > 5) return { error: "Position must be 0 to 5." };

  const { data: rotation } = await ctx.supabase.from("rotation_state").select("id").maybeSingle();
  const result = rotation
    ? await ctx.supabase
        .from("rotation_state")
        .update({ position: pos, updated_at: new Date().toISOString() })
        .eq("id", rotation.id)
    : await ctx.supabase.from("rotation_state").insert({ position: pos });
  if (result.error) return { error: result.error.message };

  revalidateScreens();
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateEngineWeights(
  weights: Record<string, number>,
): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();

  for (const [key, value] of Object.entries(weights)) {
    if (!Number.isFinite(value) || value < 0) {
      return { error: `Weight ${key} must be zero or more.` };
    }
  }

  const { data: existing } = await ctx.supabase
    .from("engine_weights")
    .select("id")
    .maybeSingle();
  const result = existing
    ? await ctx.supabase
        .from("engine_weights")
        .update({ weights, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await ctx.supabase.from("engine_weights").insert({ weights });
  if (result.error) return { error: result.error.message };

  revalidateScreens();
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateMetricTarget(
  slug: string,
  patch: { floor?: number; ceiling?: number; g_per_lb?: number; ceiling_offset?: number },
): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();

  const { data: def } = await ctx.supabase
    .from("metric_definitions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!def) return { error: "Metric not found." };

  let target: MetricTarget;
  if (def.target.type === "derived_protein") {
    const g_per_lb = patch.g_per_lb ?? def.target.g_per_lb;
    const ceiling_offset = patch.ceiling_offset ?? def.target.ceiling_offset;
    if (g_per_lb <= 0 || g_per_lb > 3) return { error: "Grams per pound must be 0-3." };
    if (ceiling_offset < 0) return { error: "Ceiling offset must be zero or more." };
    // Force a recompute on next load by clearing computed_at.
    target = { ...def.target, g_per_lb, ceiling_offset, computed_at: null };
  } else {
    const floor = patch.floor ?? def.target.floor;
    const ceiling = patch.ceiling ?? def.target.ceiling;
    if (!Number.isFinite(floor) || !Number.isFinite(ceiling) || ceiling < floor) {
      return { error: "Ceiling must be at or above floor." };
    }
    target = { type: "static", floor, ceiling };
  }

  const { error } = await ctx.supabase
    .from("metric_definitions")
    .update({ target })
    .eq("id", def.id);
  if (error) return { error: error.message };

  revalidateScreens();
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateConstraintRuleActive(
  ruleId: string,
  active: boolean,
): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();
  const { error } = await ctx.supabase
    .from("constraint_rules")
    .update({ active })
    .eq("rule_id", ruleId);
  if (error) return { error: error.message };
  revalidateScreens();
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateDefaultTimeAvailable(
  minutes: number,
): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();
  const value = Math.trunc(minutes);
  if (!Number.isFinite(value) || value <= 0) {
    return { error: "Minutes must be a positive number." };
  }
  const { data: settings } = await ctx.supabase
    .from("user_settings")
    .select("id")
    .maybeSingle();
  if (!settings) return { error: "Settings row missing." };
  const { error } = await ctx.supabase
    .from("user_settings")
    .update({ default_time_available_min: value })
    .eq("id", settings.id);
  if (error) return { error: error.message };
  revalidateScreens();
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateHabitBedtime(
  targetBedTime: string,
): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();
  if (!/^\d{2}:\d{2}$/.test(targetBedTime)) return { error: "Bed time must be HH:MM." };

  const { data: habit } = await ctx.supabase
    .from("habits")
    .select("id, config")
    .eq("slug", "sleep-timing")
    .maybeSingle();
  if (!habit) return { error: "Sleep timing habit not found." };

  const { error } = await ctx.supabase
    .from("habits")
    .update({ config: { ...habit.config, target_bed_time: targetBedTime } })
    .eq("id", habit.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/habits");
  return { ok: true };
}
