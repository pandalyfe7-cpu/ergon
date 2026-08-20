import Link from "next/link";

import { CountUp } from "@/components/count-up";
import { Sparkline } from "@/components/metrics/sparkline";
import { Card, Chip, cx } from "@/components/ui";
import {
  computeMetric,
  ensureDerivedProteinTarget,
  getErgosContext,
  loadMetricSources,
} from "@/lib/ergos/data";
import { formatNumber } from "@/lib/format";

const WINDOWS = [7, 30, 90] as const;

const TREND_GLYPHS = { up: "\u2197", down: "\u2198", flat: "\u2192" } as const;

/** Whether the 7-day trend direction is good, given the metric's direction. */
function trendTone(
  direction: "up" | "down" | "into_band",
  trend: "up" | "down" | "flat",
  current: number | null,
  floor: number,
  ceiling: number,
): "positive" | "negative" | "mid" {
  if (trend === "flat") {
    if (direction === "into_band" && current !== null) {
      return current >= floor && current <= ceiling ? "positive" : "mid";
    }
    return "mid";
  }
  if (direction === "into_band") {
    if (current === null) return "mid";
    if (current < floor) return trend === "up" ? "positive" : "negative";
    if (current > ceiling) return trend === "down" ? "positive" : "negative";
    return "mid";
  }
  return trend === direction ? "positive" : "negative";
}

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const { w } = await searchParams;
  const windowDays = WINDOWS.find((d) => String(d) === w) ?? 7;

  const ctx = await getErgosContext();
  const sources = await loadMetricSources(ctx, windowDays);

  const { data: defs } = await ctx.supabase
    .from("metric_definitions")
    .select("*")
    .order("sort_order");
  const definitions = await Promise.all(
    (defs ?? []).map((def) => ensureDerivedProteinTarget(ctx, def, sources.bodyweight)),
  );
  const metrics = definitions.map((def) =>
    computeMetric(def, sources, ctx.today, windowDays),
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-12">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-text-hi text-xl font-semibold">Metrics</h1>
          <p className="text-text-mid mt-0.5 text-sm">
            Five numbers, their trends, and how far each sits from its target.
          </p>
        </div>
        <nav aria-label="Window" className="flex gap-1">
          {WINDOWS.map((days) => (
            <Link
              key={days}
              href={days === 7 ? "/metrics" : `/metrics?w=${days}`}
              aria-current={days === windowDays ? "page" : undefined}
              className={cx(
                "num rounded-control border px-2.5 py-1 text-xs transition-colors duration-120",
                days === windowDays
                  ? "border-accent/40 text-accent"
                  : "border-border text-text-mid hover:text-text-hi",
              )}
            >
              {days}d
            </Link>
          ))}
        </nav>
      </header>

      {metrics.length === 0 ? (
        <Card>
          <p className="text-text-hi text-sm font-medium">No metrics defined.</p>
          <p className="text-text-mid mt-1 text-sm">
            Run <span className="num">npm run db:seed</span> and reload.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {metrics.map((metric, index) => {
            const { definition, current, previous, trend7d, daily } = metric;
            const { floor, ceiling } = definition.target;
            const inBand =
              current !== null && current >= floor && current <= ceiling;
            const logged = daily.filter((d) => d.value !== null).length;

            const distance =
              current === null
                ? null
                : current < floor
                  ? current - floor
                  : current > ceiling
                    ? current - ceiling
                    : 0;

            return (
              <li
                key={definition.slug}
                className="enter-rise"
                style={{ "--stagger-i": index } as React.CSSProperties}
              >
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-text-hi text-sm font-medium">
                        {definition.name}
                      </h3>
                      <p className="num text-text-hi mt-1 text-2xl">
                        {current === null ? (
                          <span className="text-text-low">—</span>
                        ) : (
                          <CountUp
                            value={current}
                            from={previous ?? current}
                            decimals={definition.unit === "score" || definition.unit === "days/week" ? 0 : 1}
                          />
                        )}
                        <span className="text-text-mid ml-1 text-sm">
                          {definition.unit}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {trend7d !== null && (
                        <Chip
                          tone={trendTone(definition.direction, trend7d, current, floor, ceiling)}
                          title="7-day trend"
                        >
                          {TREND_GLYPHS[trend7d]} 7d
                        </Chip>
                      )}
                      {current !== null && (
                        <span
                          className={cx(
                            "num text-xs",
                            inBand ? "text-positive" : "text-warning",
                          )}
                        >
                          {inBand
                            ? "in band"
                            : `${distance! > 0 ? "+" : ""}${formatNumber(distance!, 1)} ${definition.unit} from band`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    {logged === 0 ? (
                      <p className="text-text-low border-border rounded-control border border-dashed px-3 py-3 text-xs">
                        Nothing logged in this window yet.
                      </p>
                    ) : (
                      <Sparkline daily={daily} floor={floor} ceiling={ceiling} />
                    )}
                  </div>

                  <div className="text-text-low mt-2 flex items-baseline justify-between gap-3 text-xs">
                    <span className="num">
                      target {formatNumber(floor, 0)}–{formatNumber(ceiling, 0)}{" "}
                      {definition.unit}
                      {definition.target.type === "derived_protein" &&
                        definition.target.source_weight_lb !== null && (
                          <>
                            {" "}
                            · derived from{" "}
                            {formatNumber(definition.target.source_weight_lb, 1)} lb
                            7-day avg
                          </>
                        )}
                    </span>
                    <span className="num shrink-0">
                      {logged}/{daily.length} days logged
                    </span>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
