import Link from "next/link";

import { BodyExplorer, type BodyDetail } from "@/components/body/body-explorer";
import { Figures, type RegionStyles } from "@/components/body/figures";
import {
  BAND_LABEL,
  BAND_STYLE,
  DIRECTION_LABEL,
  DIRECTION_STYLE,
} from "@/components/body/palette";
import { SectionLabel } from "@/components/ui";
import {
  getTrendData,
  getWeekData,
  TREND_WEEKS,
  type BodyData,
  type TrendWeeks,
} from "@/lib/body/data";
import { stimulusBand, type StimulusBand, type TrendDirection } from "@/lib/training/stimulus";
import { MUSCLE_GROUPS } from "@/lib/types";

const MAX_WEEKS_BACK = 52;

type Params = Promise<Record<string, string | string[] | undefined>>;

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function styleFor(data: BodyData): RegionStyles {
  const styles = {} as RegionStyles;

  for (const muscle of MUSCLE_GROUPS) {
    styles[muscle] =
      data.mode === "week"
        ? BAND_STYLE[stimulusBand(data.totals[muscle].total)]
        : DIRECTION_STYLE[data.trends[muscle].direction];
  }

  return styles;
}

export default async function BodyPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const mode = readParam(params, "mode") === "trend" ? "trend" : "week";

  const weeksAgo = Math.min(
    Math.max(Number(readParam(params, "week")) || 0, 0),
    MAX_WEEKS_BACK,
  );

  const requested = Number(readParam(params, "weeks"));
  const weeks: TrendWeeks = TREND_WEEKS.includes(requested as TrendWeeks)
    ? (requested as TrendWeeks)
    : TREND_WEEKS[0];

  const data = mode === "trend" ? await getTrendData(weeks) : await getWeekData(weeksAgo);

  const detail: BodyDetail =
    data.mode === "week"
      ? { mode: "week", totals: data.totals }
      : { mode: "trend", trends: data.trends, weekLabels: data.weekLabels };

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Body</h1>
        <Link href="/" className="text-fg-dim hover:text-fg text-xs underline">
          Today
        </Link>
      </header>

      <div className="border-border mb-4 flex rounded-md border p-0.5">
        <Toggle href="/body" active={mode === "week"}>
          This week
        </Toggle>
        <Toggle href={`/body?mode=trend&weeks=${weeks}`} active={mode === "trend"}>
          Trend
        </Toggle>
      </div>

      {data.mode === "week" ? (
        <div className="mb-3 flex items-center justify-between">
          <Step href={`/body?week=${weeksAgo + 1}`} disabled={weeksAgo >= MAX_WEEKS_BACK}>
            {"\u2190"}
          </Step>
          <span className="num text-sm">{data.label}</span>
          <Step href={`/body?week=${weeksAgo - 1}`} disabled={weeksAgo === 0}>
            {"\u2192"}
          </Step>
        </div>
      ) : (
        <div className="mb-3 flex gap-2">
          {TREND_WEEKS.map((option) => (
            <Link
              key={option}
              href={`/body?mode=trend&weeks=${option}`}
              className={`num flex-1 rounded-md border py-1.5 text-center text-sm ${
                option === data.weeks
                  ? "border-accent text-fg"
                  : "border-border text-fg-dim hover:text-fg"
              }`}
            >
              {option} wk
            </Link>
          ))}
        </div>
      )}

      {data.hasWork ? null : (
        <p className="text-fg-dim mb-3 text-sm">
          {data.mode === "week" ? "No sets this week." : "No sets in this timeframe."}
        </p>
      )}

      <BodyExplorer detail={detail}>
        <Figures styles={styleFor(data)} />
      </BodyExplorer>

      <div className="mt-6">
        <SectionLabel>Scale</SectionLabel>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {data.mode === "week"
            ? (["none", "low", "in_range", "high"] as StimulusBand[]).map((band) => (
                <Key key={band} style={BAND_STYLE[band]} label={BAND_LABEL[band]} />
              ))
            : (["rising", "flat", "falling"] as TrendDirection[]).map((direction) => (
                <Key
                  key={direction}
                  style={DIRECTION_STYLE[direction]}
                  label={DIRECTION_LABEL[direction]}
                />
              ))}
        </ul>
      </div>
    </main>
  );
}

function Toggle({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      className={`flex-1 rounded py-1.5 text-center text-sm ${
        active ? "bg-accent text-background" : "text-fg-dim hover:text-fg"
      }`}
    >
      {children}
    </Link>
  );
}

function Step({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: string;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        className="border-border text-border-strong size-8 rounded-md border text-center leading-8"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="border-border text-fg-dim hover:text-fg size-8 rounded-md border text-center leading-8"
    >
      {children}
    </Link>
  );
}

function Key({
  style,
  label,
}: {
  style: { fill: string; stroke: string };
  label: string;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className="size-3 rounded-sm border"
        style={{ backgroundColor: style.fill, borderColor: style.stroke }}
      />
      <span className="text-fg-dim text-[11px]">{label}</span>
    </li>
  );
}
