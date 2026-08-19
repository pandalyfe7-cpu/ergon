import Link from "next/link";

import { GoalRing, LineChart } from "@/components/progress/charts";
import { LogWeightButton } from "@/components/today/quick-logs";
import { Panel, SectionLabel } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import {
  getProgressData,
  TREND_DAYS,
  WEIGHT_DAYS,
  type TrendDays,
  type WeightDays,
} from "@/lib/progress/data";
import { formatMonthDay } from "@/lib/time";

type Params = Promise<Record<string, string | string[] | undefined>>;

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function href(weight: WeightDays, trend: TrendDays) {
  return `/progress?weight=${weight}&days=${trend}`;
}

export default async function ProgressPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;

  const requestedWeight = Number(readParam(params, "weight"));
  const weightDays: WeightDays = WEIGHT_DAYS.includes(requestedWeight as WeightDays)
    ? (requestedWeight as WeightDays)
    : 90;

  const requestedTrend = Number(readParam(params, "days"));
  const trendDays: TrendDays = TREND_DAYS.includes(requestedTrend as TrendDays)
    ? (requestedTrend as TrendDays)
    : TREND_DAYS[0];

  const data = await getProgressData(weightDays, trendDays);

  const hasWeight = data.weightPoints.some((point) => point.value !== null);
  const hasCalories = data.caloriePoints.some((point) => point.value !== null);
  const hasVolume = data.volumePoints.some((point) => point.value !== null);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Progress</h1>
        <Link href="/" className="text-fg-dim hover:text-fg text-xs underline">
          Today
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Panel className="p-3">
          <SectionLabel>Streak</SectionLabel>
          <p className="num mt-2 text-3xl leading-none">{data.streak}</p>
          <p className="text-fg-dim mt-1.5 text-[11px]">
            {data.streak === 0
              ? "No meals logged yet"
              : data.streakIncludesToday
                ? `${data.streak === 1 ? "Day" : "Days"} logged`
                : "Through yesterday"}
          </p>
        </Panel>

        <Panel className="p-3">
          <SectionLabel>Sessions</SectionLabel>
          <div className="mt-2">
            <GoalRing
              value={data.sessionsThisWeek}
              target={data.weeklySessionTarget}
              label={data.weekLabel}
            />
          </div>
        </Panel>
      </div>

      <section className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <SectionLabel>Bodyweight</SectionLabel>
          <Windows
            options={WEIGHT_DAYS}
            active={weightDays}
            hrefFor={(option) => href(option, trendDays)}
          />
        </div>

        {data.currentWeightLb === null ? null : (
          <p className="mt-2 flex items-baseline gap-2">
            <span className="num text-3xl leading-none">
              {formatNumber(data.currentWeightLb)}
            </span>
            <span className="text-fg-dim text-xs">
              lb
              {data.currentWeightDate ? `, ${formatMonthDay(data.currentWeightDate)}` : ""}
            </span>
          </p>
        )}

        <div className="mt-3">
          {hasWeight ? (
            <LineChart
              points={data.weightPoints}
              format={(value) => `${formatNumber(value)}`}
            />
          ) : (
            <Empty>No weight logged in this window.</Empty>
          )}
        </div>

        <LogWeightButton className="mt-3 w-full" />
      </section>

      <section className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <SectionLabel>Calories</SectionLabel>
          <Windows
            options={TREND_DAYS}
            active={trendDays}
            hrefFor={(option) => href(weightDays, option)}
          />
        </div>

        <div className="mt-3">
          {hasCalories ? (
            <LineChart
              points={data.caloriePoints}
              target={data.calorieTarget}
              targetLabel={
                data.calorieTarget === null
                  ? undefined
                  : `Target ${formatNumber(data.calorieTarget)}`
              }
              format={(value) => formatNumber(value)}
            />
          ) : (
            <Empty>No meals logged in this window.</Empty>
          )}
        </div>
      </section>

      <section className="mt-6">
        <SectionLabel>Training volume</SectionLabel>
        <div className="mt-3">
          {hasVolume ? (
            <LineChart
              points={data.volumePoints}
              format={(value) => `${formatNumber(Math.round(value))} lb`}
            />
          ) : (
            <Empty>No sets logged in this window.</Empty>
          )}
        </div>
      </section>

      <section className="mt-6">
        <SectionLabel>Personal records</SectionLabel>
        {data.records.length === 0 ? (
          <div className="mt-2">
            <Empty>No working sets logged yet.</Empty>
          </div>
        ) : (
          <ul className="divide-border border-border mt-2 divide-y border-t border-b">
            {data.records.map((record) => (
              <li
                key={record.exercise.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">{record.exercise.name}</span>
                <span className="flex shrink-0 items-baseline gap-3">
                  <span className="num text-fg-dim text-[11px]">
                    {formatNumber(record.weight_lb)}
                    {"\u00d7"}
                    {record.reps}
                  </span>
                  <span className="num w-16 text-right text-sm">
                    {formatNumber(record.best)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-fg-dim text-sm">{children}</p>;
}

function Windows<T extends number>({
  options,
  active,
  hrefFor,
}: {
  options: readonly T[];
  active: T;
  hrefFor: (option: T) => string;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((option) => (
        <Link
          key={option}
          href={hrefFor(option)}
          className={`num rounded border px-2 py-0.5 text-[11px] ${
            option === active
              ? "border-accent text-fg"
              : "border-border text-fg-dim hover:text-fg"
          }`}
        >
          {option}d
        </Link>
      ))}
    </div>
  );
}
