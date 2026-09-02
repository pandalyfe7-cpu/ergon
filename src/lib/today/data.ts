import { getErgosContext } from "@/lib/ergos/data";
import { buildTodayList } from "@/lib/today/list";
import type { PlanDraft } from "@/lib/onboarding/plan";

export async function loadTodayList() {
  const ctx = await getErgosContext();

  const [{ data: profile }, { data: habits }, { data: metrics }] = await Promise.all([
    ctx.supabase.from("user_profile").select("capacity").maybeSingle(),
    ctx.supabase.from("habits").select("id, slug, name"),
    ctx.supabase.from("metric_definitions").select("id, slug, name, unit"),
  ]);

  const capacity = profile?.capacity as { plan?: PlanDraft } | null;
  const plan = capacity?.plan ?? null;

  const habitIds = (habits ?? []).map((row) => row.id);
  const { data: events } =
    habitIds.length > 0
      ? await ctx.supabase
          .from("habit_events")
          .select("id, habit_id, rule_id, rule_version, trace")
          .eq("event_date", ctx.today)
          .in("event_type", ["completed", "floor"])
          .in("habit_id", habitIds)
      : { data: [] };

  const { data: metricLogs } = await ctx.supabase
    .from("metric_logs")
    .select("id, metric_slug, value, rule_id, rule_version, trace")
    .eq("log_date", ctx.today);

  const habitIdToSlug = new Map((habits ?? []).map((row) => [row.id, row.slug]));
  const todayMarks = new Map<
    string,
    { id: string; rule_id: string | null; rule_version: string | null; trace: unknown }
  >();
  for (const event of events ?? []) {
    const slug = habitIdToSlug.get(event.habit_id);
    if (!slug) continue;
    todayMarks.set(slug, event);
  }

  const todayMetrics = new Map(
    (metricLogs ?? []).map((row) => [
      row.metric_slug,
      {
        id: row.id,
        value: row.value,
        rule_id: row.rule_id,
        rule_version: row.rule_version,
        trace: row.trace,
      },
    ]),
  );

  return buildTodayList({
    plan,
    habitsBySlug: new Map((habits ?? []).map((row) => [row.slug, row])),
    metricsBySlug: new Map((metrics ?? []).map((row) => [row.slug, row])),
    todayMarks,
    todayMetrics,
  });
}
