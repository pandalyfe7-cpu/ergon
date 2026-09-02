import {
  TODAY_HABIT_LOG_RULE_ID,
  TODAY_HABIT_LOG_RULE_VERSION,
  TODAY_METRIC_LOG_RULE_ID,
  TODAY_METRIC_LOG_RULE_VERSION,
} from "@/lib/today/constants";
import type { TraceEntry } from "@/lib/types";

export type StoredProvenance = {
  rule_id: string;
  rule_version: string;
  trace: TraceEntry[];
};

export function buildHabitLogProvenance(input: {
  habitId: string;
  habitSlug: string;
  eventId: string;
  eventType: "completed" | "floor";
  eventDate: string;
}): StoredProvenance {
  const trace: TraceEntry[] = [
    {
      rule_id: TODAY_HABIT_LOG_RULE_ID,
      detail: `habit ${input.habitSlug} marked ${input.eventType} on ${input.eventDate}`,
      rows: [
        `habits ${input.habitId} slug=${input.habitSlug}`,
        `habit_events ${input.eventId} event_type=${input.eventType} event_date=${input.eventDate}`,
      ],
    },
  ];
  return {
    rule_id: TODAY_HABIT_LOG_RULE_ID,
    rule_version: TODAY_HABIT_LOG_RULE_VERSION,
    trace,
  };
}

export function buildMetricLogProvenance(input: {
  metricId: string;
  metricSlug: string;
  logId: string;
  value: number;
  logDate: string;
}): StoredProvenance {
  const trace: TraceEntry[] = [
    {
      rule_id: TODAY_METRIC_LOG_RULE_ID,
      detail: `metric ${input.metricSlug} logged ${input.value} on ${input.logDate}`,
      rows: [
        `metric_definitions ${input.metricId} slug=${input.metricSlug}`,
        `metric_logs ${input.logId} value=${input.value} log_date=${input.logDate}`,
      ],
    },
  ];
  return {
    rule_id: TODAY_METRIC_LOG_RULE_ID,
    rule_version: TODAY_METRIC_LOG_RULE_VERSION,
    trace,
  };
}
