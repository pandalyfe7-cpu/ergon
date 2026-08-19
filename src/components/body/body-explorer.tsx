"use client";

import { useState, type MouseEvent, type ReactNode } from "react";

import { Sheet } from "@/components/sheet";
import { formatMuscleGroup, formatNumber } from "@/lib/format";
import {
  compareTrend,
  stimulusBand,
  type StimulusTotals,
  type TrendTotals,
} from "@/lib/training/stimulus";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/types";

import { BAND_LABEL, DIRECTION_LABEL } from "./palette";

export type BodyDetail =
  | { mode: "week"; totals: StimulusTotals }
  | { mode: "trend"; trends: TrendTotals; weekLabels: string[] };

/**
 * Figures are rendered on the server and passed in, so the traced path data
 * never reaches the browser. Region taps arrive here by delegation.
 */
export function BodyExplorer({
  detail,
  children,
}: {
  detail: BodyDetail;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<MuscleGroup | null>(null);

  function onFigureClick(event: MouseEvent<HTMLDivElement>) {
    const region = (event.target as Element).closest("[data-muscle]");
    const muscle = region?.getAttribute("data-muscle");
    if (muscle) setSelected(muscle as MuscleGroup);
  }

  const rows = rankedRows(detail);

  return (
    <>
      <div onClick={onFigureClick}>{children}</div>

      <ul className="divide-border border-border mt-6 divide-y border-t border-b">
        {rows.map((row) => (
          <li key={row.muscle}>
            <button
              type="button"
              onClick={() => setSelected(row.muscle)}
              className="hover:bg-surface -mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 px-2 py-2 text-left"
            >
              <span className="text-sm">{formatMuscleGroup(row.muscle)}</span>
              <span className="flex items-baseline gap-3">
                <span className="text-fg-dim text-[11px]">{row.label}</span>
                <span className="num w-16 text-right text-sm">{row.value}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? formatMuscleGroup(selected) : ""}
      >
        {selected ? <Detail detail={detail} muscle={selected} /> : null}
      </Sheet>
    </>
  );
}

type Row = { muscle: MuscleGroup; label: string; value: string };

function rankedRows(detail: BodyDetail): Row[] {
  if (detail.mode === "week") {
    return [...MUSCLE_GROUPS]
      .sort((a, b) => detail.totals[b].total - detail.totals[a].total)
      .map((muscle) => {
        const total = detail.totals[muscle].total;
        return {
          muscle,
          label: BAND_LABEL[stimulusBand(total)],
          value: formatNumber(total),
        };
      });
  }

  return [...MUSCLE_GROUPS]
    .sort((a, b) => compareTrend(detail.trends[a], detail.trends[b]))
    .map((muscle) => {
      const trend = detail.trends[muscle];
      return {
        muscle,
        label: DIRECTION_LABEL[trend.direction],
        value: formatChange(trend.percentChange, trend.current),
      };
    });
}

/** No prior period to divide by reads as "new" rather than an infinite rise. */
function formatChange(percentChange: number | null, current: number): string {
  if (percentChange === null) return current > 0 ? "new" : "\u2014";
  const rounded = Math.round(percentChange);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function Detail({ detail, muscle }: { detail: BodyDetail; muscle: MuscleGroup }) {
  if (detail.mode === "week") {
    const { total, byExercise } = detail.totals[muscle];

    if (byExercise.length === 0) {
      return <p className="text-fg-dim text-sm">No sets this week.</p>;
    }

    return (
      <div className="space-y-3">
        {byExercise.map((row) => (
          <div key={row.exercise.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm">{row.exercise.name}</span>
              <span className="num text-sm">{formatNumber(row.subtotal)}</span>
            </div>
            <p className="text-fg-dim num mt-0.5 text-[11px]">
              {row.sets.length} {row.sets.length === 1 ? "set" : "sets"} {"\u00d7"}{" "}
              {formatNumber(row.weight)}
            </p>
            <ul className="text-fg-dim num mt-1 space-y-0.5 text-[11px]">
              {row.sets.map((set) => (
                <li key={set.id}>
                  {formatNumber(set.weight_lb)} lb {"\u00d7"} {set.reps}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="border-border flex items-baseline justify-between border-t pt-2">
          <span className="text-fg-dim text-xs">Total</span>
          <span className="num text-sm">{formatNumber(total)}</span>
        </div>
      </div>
    );
  }

  const trend = detail.trends[muscle];

  return (
    <div className="space-y-3">
      <ul className="space-y-1">
        {detail.weekLabels.map((label, index) => (
          <li key={label} className="flex items-baseline justify-between gap-3">
            <span className="text-fg-dim text-xs">{label}</span>
            <span className="num text-sm">{formatNumber(trend.weekly[index] ?? 0)}</span>
          </li>
        ))}
      </ul>

      <div className="border-border space-y-1 border-t pt-2">
        <div className="flex items-baseline justify-between">
          <span className="text-fg-dim text-xs">Prior period</span>
          <span className="num text-sm">{formatNumber(trend.prior)}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-fg-dim text-xs">This period</span>
          <span className="num text-sm">{formatNumber(trend.current)}</span>
        </div>
      </div>
    </div>
  );
}
