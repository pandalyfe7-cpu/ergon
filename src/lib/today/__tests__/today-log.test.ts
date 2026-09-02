import { describe, expect, it } from "vitest";

import {
  TODAY_HABIT_LOG_RULE_ID,
  TODAY_HABIT_LOG_RULE_VERSION,
  TODAY_METRIC_LOG_RULE_ID,
  TODAY_METRIC_LOG_RULE_VERSION,
} from "@/lib/today/constants";
import { buildHabitLogProvenance, buildMetricLogProvenance } from "@/lib/today/provenance";
import { buildTodayList } from "@/lib/today/list";

describe("today logging provenance", () => {
  it("builds habit log provenance with rule id, version, and row ids", () => {
    const provenance = buildHabitLogProvenance({
      habitId: "habit-uuid",
      habitSlug: "study-blocks",
      eventId: "event-uuid",
      eventType: "completed",
      eventDate: "2026-09-02",
    });

    expect(provenance.rule_id).toBe(TODAY_HABIT_LOG_RULE_ID);
    expect(provenance.rule_version).toBe(TODAY_HABIT_LOG_RULE_VERSION);
    expect(provenance.trace[0]?.rows).toContain("habits habit-uuid slug=study-blocks");
    expect(provenance.trace[0]?.rows).toContain(
      "habit_events event-uuid event_type=completed event_date=2026-09-02",
    );
  });

  it("builds metric log provenance with rule id, version, and row ids", () => {
    const provenance = buildMetricLogProvenance({
      metricId: "metric-uuid",
      metricSlug: "protein",
      logId: "log-uuid",
      value: 165,
      logDate: "2026-09-02",
    });

    expect(provenance.rule_id).toBe(TODAY_METRIC_LOG_RULE_ID);
    expect(provenance.rule_version).toBe(TODAY_METRIC_LOG_RULE_VERSION);
    expect(provenance.trace[0]?.rows).toContain("metric_definitions metric-uuid slug=protein");
    expect(provenance.trace[0]?.rows).toContain(
      "metric_logs log-uuid value=165 log_date=2026-09-02",
    );
  });
});

describe("today list", () => {
  it("highlights the first unlogged item and advances after logs", () => {
    const plan = {
      habits: [{ slug: "study-blocks", state: "build" as const, frequencyPerWeek: 7 }],
      metrics: [{ slug: "protein" }],
      training: null,
      rule_id: "plan_generate",
      rule_version: "1.0.0",
      trace: [],
    };

    const pending = buildTodayList({
      plan,
      habitsBySlug: new Map([["study-blocks", { id: "h1", name: "Study blocks" }]]),
      metricsBySlug: new Map([["protein", { id: "m1", name: "Protein intake", unit: "g" }]]),
      todayMarks: new Map(),
      todayMetrics: new Map(),
    });
    expect(pending.nextIndex).toBe(0);

    const habitDone = buildTodayList({
      plan,
      habitsBySlug: new Map([["study-blocks", { id: "h1", name: "Study blocks" }]]),
      metricsBySlug: new Map([["protein", { id: "m1", name: "Protein intake", unit: "g" }]]),
      todayMarks: new Map([
        [
          "study-blocks",
          {
            id: "e1",
            rule_id: TODAY_HABIT_LOG_RULE_ID,
            rule_version: TODAY_HABIT_LOG_RULE_VERSION,
            trace: [],
          },
        ],
      ]),
      todayMetrics: new Map(),
    });
    expect(habitDone.nextIndex).toBe(1);
  });
});
