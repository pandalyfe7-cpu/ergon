"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { TraceBlock } from "@/components/trace-block";
import { useToast } from "@/components/toast";
import { Button, Card, NumberField, cx } from "@/components/ui";
import { call } from "@/lib/client/call";
import { logTodayHabit, logTodayMetric } from "@/lib/today/actions";
import type { TodayItem, TodayList } from "@/lib/today/list";

export function TodayListView({ list }: { list: TodayList }) {
  if (list.items.length === 0) {
    return (
      <Card>
        <p className="text-text-mid text-sm">
          No plan items for today. Finish onboarding to generate a plan.
        </p>
      </Card>
    );
  }

  return (
    <ul className="space-y-3" aria-label="Today list">
      {list.items.map((item, index) => (
        <TodayListRow
          key={itemKey(item)}
          item={item}
          highlighted={list.nextIndex === index}
        />
      ))}
    </ul>
  );
}

function itemKey(item: TodayItem): string {
  if (item.kind === "session") return "session";
  return `${item.kind}-${item.slug}`;
}

function TodayListRow({ item, highlighted }: { item: TodayItem; highlighted: boolean }) {
  if (item.kind === "session") {
    return (
      <li>
        <Card className={cx(highlighted && "border-accent bg-accent-soft border-2")}>
          <Link href={item.href} className="text-text-hi text-sm font-medium hover:underline">
            {item.label}
          </Link>
        </Card>
      </li>
    );
  }

  if (item.kind === "habit") {
    return (
      <li>
        <HabitRow item={item} highlighted={highlighted} />
      </li>
    );
  }

  return (
    <li>
      <MetricRow item={item} highlighted={highlighted} />
    </li>
  );
}

function formatPendingTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function HabitRow({
  item,
  highlighted,
}: {
  item: Extract<TodayItem, { kind: "habit" }>;
  highlighted: boolean;
}) {
  const router = useRouter();
  const { fail } = useToast();
  const [pending, start] = useTransition();
  const [pulse, setPulse] = useState(false);
  const [optimisticLogged, setOptimisticLogged] = useState(false);
  const [pendingAt, setPendingAt] = useState<string | null>(null);

  useEffect(() => {
    if (item.logged) {
      setOptimisticLogged(false);
      setPendingAt(null);
    }
  }, [item.logged]);

  const displayedLogged = item.logged || optimisticLogged;
  const isPending = optimisticLogged && !item.logged;

  function mark() {
    if (item.logged || pending) return;
    const stampedAt = formatPendingTime(new Date());
    setOptimisticLogged(true);
    setPendingAt(stampedAt);
    start(async () => {
      const result = await call(logTodayHabit(item.slug));
      if ("error" in result) {
        setOptimisticLogged(false);
        setPendingAt(null);
        fail(`Could not log habit: ${result.error}`, mark);
        return;
      }
      setPulse(true);
      window.setTimeout(() => setPulse(false), 400);
      router.refresh();
    });
  }

  return (
    <div data-testid={`today-item-${item.slug}`}>
      <Card
        className={cx(
          highlighted && "border-accent bg-accent-soft border-2",
          displayedLogged && "border-positive/40",
          pulse && "pulse-positive",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-text-hi text-sm font-medium">{item.name}</p>
            {displayedLogged && (
              <div className="mt-1">
                <p className="text-positive text-xs">Logged</p>
                {isPending && pendingAt && (
                  <p className="text-text-low num text-xs">{pendingAt}</p>
                )}
              </div>
            )}
          </div>
          {!displayedLogged && (
            <Button
              variant={highlighted ? "primary" : "secondary"}
              disabled={pending}
              onClick={mark}
              className="min-h-11 min-w-20"
              aria-label={`Log ${item.name}`}
            >
              Log
            </Button>
          )}
        </div>
        {item.logged && item.provenance && <TraceBlock provenance={item.provenance} />}
      </Card>
    </div>
  );
}

function MetricRow({
  item,
  highlighted,
}: {
  item: Extract<TodayItem, { kind: "metric" }>;
  highlighted: boolean;
}) {
  const router = useRouter();
  const { fail } = useToast();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(item.logged ? String(item.value ?? "") : "");
  const [pulse, setPulse] = useState(false);

  function save() {
    if (item.logged || pending) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      fail("Enter a number.", save);
      return;
    }
    start(async () => {
      const result = await call(logTodayMetric(item.slug, parsed));
      if ("error" in result) {
        fail(`Could not log metric: ${result.error}`, save);
        return;
      }
      setPulse(true);
      window.setTimeout(() => setPulse(false), 400);
      router.refresh();
    });
  }

  return (
    <div data-testid={`today-item-${item.slug}`}>
      <Card
        className={cx(
          highlighted && "border-accent bg-accent-soft border-2",
          item.logged && "border-positive/40",
          pulse && "pulse-positive",
        )}
      >
        <label htmlFor={`metric-${item.slug}`} className="text-text-hi text-sm font-medium">
          {item.name}
        </label>
        {item.logged ? (
          <p className="text-text-hi num mt-2 text-sm">
            {item.value}
            <span className="text-text-mid ml-1">{item.unit}</span>
            <span className="text-positive ml-2 text-xs">Logged</span>
          </p>
        ) : (
          <div className="mt-2 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <NumberField
                id={`metric-${item.slug}`}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-label={`${item.name} value`}
              />
            </div>
            <Button
              variant={highlighted ? "primary" : "secondary"}
              disabled={pending}
              onClick={save}
              className="min-h-11"
            >
              Save
            </Button>
          </div>
        )}
        {item.logged && item.provenance && <TraceBlock provenance={item.provenance} />}
      </Card>
    </div>
  );
}
