import type { StoredProvenance } from "@/lib/today/provenance";
import type { PlanDraft } from "@/lib/onboarding/plan";

export type TodayHabitItem = {
  kind: "habit";
  slug: string;
  name: string;
  logged: boolean;
  eventId: string | null;
  provenance: StoredProvenance | null;
};

export type TodayMetricItem = {
  kind: "metric";
  slug: string;
  name: string;
  unit: string;
  logged: boolean;
  value: number | null;
  logId: string | null;
  provenance: StoredProvenance | null;
};

export type TodaySessionItem = {
  kind: "session";
  label: string;
  href: "/train";
};

export type TodayItem = TodayHabitItem | TodayMetricItem | TodaySessionItem;

export type TodayList = {
  items: TodayItem[];
  /** Index of the next item to log; null when all are done. */
  nextIndex: number | null;
};

type PlanShape = PlanDraft;

function toProvenance(row: {
  rule_id: string | null;
  rule_version: string | null;
  trace: unknown;
} | null): StoredProvenance | null {
  if (!row?.rule_id || !row.rule_version) return null;
  return {
    rule_id: row.rule_id,
    rule_version: row.rule_version,
    trace: Array.isArray(row.trace) ? (row.trace as StoredProvenance["trace"]) : [],
  };
}

/** Builds the chronological Today list from the stored plan and today's logs. */
export function buildTodayList(input: {
  plan: PlanShape | null;
  habitsBySlug: Map<string, { id: string; name: string }>;
  metricsBySlug: Map<string, { id: string; name: string; unit: string }>;
  todayMarks: Map<
    string,
    { id: string; rule_id: string | null; rule_version: string | null; trace: unknown }
  >;
  todayMetrics: Map<
    string,
    { id: string; value: number; rule_id: string; rule_version: string; trace: unknown }
  >;
}): TodayList {
  if (!input.plan) {
    return { items: [], nextIndex: null };
  }

  const items: TodayItem[] = [];

  for (const habit of input.plan.habits) {
    const row = input.habitsBySlug.get(habit.slug);
    if (!row) continue;
    const mark = input.todayMarks.get(habit.slug);
    items.push({
      kind: "habit",
      slug: habit.slug,
      name: row.name,
      logged: Boolean(mark),
      eventId: mark?.id ?? null,
      provenance: toProvenance(mark ?? null),
    });
  }

  for (const metric of input.plan.metrics) {
    const row = input.metricsBySlug.get(metric.slug);
    if (!row) continue;
    const log = input.todayMetrics.get(metric.slug);
    items.push({
      kind: "metric",
      slug: metric.slug,
      name: row.name,
      unit: row.unit,
      logged: Boolean(log),
      value: log?.value ?? null,
      logId: log?.id ?? null,
      provenance: log
        ? {
            rule_id: log.rule_id,
            rule_version: log.rule_version,
            trace: Array.isArray(log.trace)
              ? (log.trace as StoredProvenance["trace"])
              : [],
          }
        : null,
    });
  }

  if (input.plan.training) {
    items.push({
      kind: "session",
      label: "Open training session",
      href: "/train",
    });
  }

  const nextIndex = items.findIndex(
    (item) => item.kind !== "session" && !("logged" in item && item.logged),
  );

  return {
    items,
    nextIndex: nextIndex === -1 ? null : nextIndex,
  };
}
