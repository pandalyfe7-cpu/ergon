"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { getErgosContext } from "@/lib/ergos/data";
import { buildHabitLogProvenance, buildMetricLogProvenance } from "@/lib/today/provenance";

export async function logTodayHabit(
  slug: string,
): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();

  const { data: habit } = await ctx.supabase
    .from("habits")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!habit) return { error: "Habit not found." };

  const eventId = randomUUID();
  const provenance = buildHabitLogProvenance({
    habitId: habit.id,
    habitSlug: habit.slug,
    eventId,
    eventType: "completed",
    eventDate: ctx.today,
  });

  const { error } = await ctx.supabase.from("habit_events").insert({
    id: eventId,
    habit_id: habit.id,
    event_type: "completed",
    event_date: ctx.today,
    rule_id: provenance.rule_id,
    rule_version: provenance.rule_version,
    trace: provenance.trace,
  });
  if (error && !error.message.includes("duplicate")) return { error: error.message };

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
  }

  revalidatePath("/today");
  return { ok: true };
}

export async function logTodayMetric(
  slug: string,
  value: number,
): Promise<{ error: string } | { ok: true }> {
  const ctx = await getErgosContext();

  if (!Number.isFinite(value)) return { error: "Enter a number." };

  const { data: metric } = await ctx.supabase
    .from("metric_definitions")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!metric) return { error: "Metric not found." };

  const { data: existing } = await ctx.supabase
    .from("metric_logs")
    .select("id")
    .eq("metric_slug", slug)
    .eq("log_date", ctx.today)
    .maybeSingle();

  const logId = existing?.id ?? randomUUID();
  const provenance = buildMetricLogProvenance({
    metricId: metric.id,
    metricSlug: metric.slug,
    logId,
    value,
    logDate: ctx.today,
  });
  const { error } = await ctx.supabase.from("metric_logs").upsert(
    {
      id: logId,
      metric_slug: slug,
      log_date: ctx.today,
      value,
      rule_id: provenance.rule_id,
      rule_version: provenance.rule_version,
      trace: provenance.trace,
    },
    { onConflict: "user_id,metric_slug,log_date" },
  );
  if (error) return { error: error.message };

  revalidatePath("/today");
  return { ok: true };
}
