"use client";

/**
 * One habit: state chip, streak, decay countdown, today's mark, and quiet
 * manual state controls. Marking is optimistic with rollback + retry.
 */

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useToast } from "@/components/toast";
import { Button, CheckIcon, Chip, cx } from "@/components/ui";
import { call } from "@/lib/client/call";
import { markHabit, setHabitState } from "@/lib/ergos/actions";
import { formatMonthDay } from "@/lib/time";
import type { HabitState } from "@/lib/types";

const STATE_TONES: Record<HabitState, "accent" | "positive" | "warning" | "mid"> = {
  build: "accent",
  hold: "positive",
  recover: "warning",
  dormant: "mid",
};

const STATE_LABELS: Record<HabitState, string> = {
  build: "Build",
  hold: "Hold",
  recover: "Recover",
  dormant: "Dormant",
};

const STRIP_OUTCOME: Record<HabitStripDay["outcome"], string> = {
  met: "met",
  missed: "missed",
  unknown: "unknown",
};

export type HabitStripDay = {
  date: string;
  outcome: "met" | "missed" | "unknown";
};

export type HabitCardData = {
  slug: string;
  name: string;
  state: HabitState;
  stateMeaning: string;
  advanceRule: string;
  floorAction: string;
  streak: number;
  markedToday: boolean;
  /** Days until the decay window closes; negative when already past. */
  daysLeft: number;
  /** True when a system event marks this habit rather than a button. */
  auto: boolean;
  /** Last 14 days, oldest first. */
  strip: HabitStripDay[];
};

export function HabitCard({ habit, index }: { habit: HabitCardData; index: number }) {
  const router = useRouter();
  const { fail } = useToast();
  const [, startTransition] = useTransition();
  const [marked, setMarked] = useState(habit.markedToday);
  const [state, setState] = useState(habit.state);
  const [pulse, setPulse] = useState(false);
  const [showStates, setShowStates] = useState(false);

  useEffect(() => {
    setState(habit.state);
  }, [habit.state]);

  function mark(kind: "completed" | "floor") {
    setMarked(true);
    setPulse(true);
    startTransition(async () => {
      const result = await call(markHabit(habit.slug, kind));
      if ("error" in result) {
        setMarked(false);
        setPulse(false);
        fail(`Mark not saved: ${result.error}`, () => mark(kind));
        return;
      }
      router.refresh();
    });
  }

  function moveTo(next: HabitState) {
    setShowStates(false);
    const prev = state;
    setState(next);
    startTransition(async () => {
      const result = await call(setHabitState(habit.slug, next));
      if ("error" in result) {
        setState(prev);
        fail(`State not changed: ${result.error}`, () => moveTo(next));
        return;
      }
      router.refresh();
    });
  }

  const overdue = !marked && habit.daysLeft <= 0 && state !== "dormant";
  const dueSoon = !marked && habit.daysLeft === 1 && state !== "dormant";

  return (
    <li
      className={cx(
        "border-border bg-surface rounded-card enter-rise min-w-0 border p-5",
        pulse && "pulse-positive",
      )}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-text-hi min-w-0 truncate text-sm font-medium">{habit.name}</h3>
        <div className="relative shrink-0">
          <button
            className="rounded-chip focus-visible:outline-accent"
            aria-label={`Change state of ${habit.name}, currently ${STATE_LABELS[state]}`}
            title={habit.stateMeaning}
            onClick={() => setShowStates((v) => !v)}
          >
            <Chip tone={STATE_TONES[state]} title={habit.stateMeaning}>
              {STATE_LABELS[state]}
            </Chip>
          </button>
          {showStates && (
            <div className="border-border bg-surface-2 shadow-overlay rounded-card absolute right-0 z-10 mt-1 w-36 border p-1">
              {(Object.keys(STATE_LABELS) as HabitState[]).map((option) => (
                <button
                  key={option}
                  className={cx(
                    "rounded-control block w-full px-2.5 py-1.5 text-left text-sm",
                    option === state
                      ? "text-accent"
                      : "text-text-mid hover:bg-surface hover:text-text-hi",
                  )}
                  onClick={() => moveTo(option)}
                >
                  {STATE_LABELS[option]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="num text-text-hi text-sm">
          {habit.streak}
          <span className="text-text-low text-xs"> day streak</span>
        </span>
        {marked ? (
          <span className="text-positive inline-flex items-center gap-1 text-xs">
            <CheckIcon /> marked today
          </span>
        ) : state === "dormant" ? (
          <span className="text-text-low text-xs">paused; any mark resumes it</span>
        ) : overdue ? (
          <span className="text-warning text-xs">
            decay window passed; the floor is enough
          </span>
        ) : (
          <span className={cx("num text-xs", dueSoon ? "text-warning" : "text-text-low")}>
            {habit.daysLeft}d left in window
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div aria-label="Last 14 days" className="flex items-center gap-1">
          {habit.strip.map((day) => (
            <span
              key={day.date}
              title={`${formatMonthDay(day.date)} · ${STRIP_OUTCOME[day.outcome]}`}
              className={cx(
                "size-2 shrink-0 rounded-full",
                day.outcome === "met" && "bg-positive",
                day.outcome === "missed" && "border-text-mid border bg-transparent",
                day.outcome === "unknown" &&
                  "border-text-low border border-dashed bg-transparent",
              )}
            />
          ))}
        </div>
        {habit.auto ? (
          <p className="text-text-low text-xs">{habit.advanceRule}</p>
        ) : marked ? (
          <p className="text-text-low text-xs">{habit.advanceRule}</p>
        ) : (
          <div className="flex shrink-0 gap-2">
            {(overdue || state === "recover") && (
              <Button
                variant="quiet"
                className="px-2.5 py-1.5 text-xs"
                title={habit.floorAction}
                onClick={() => mark("floor")}
              >
                Did the floor
              </Button>
            )}
            <Button variant="primary" className="px-2.5 py-1.5 text-xs" onClick={() => mark("completed")}>
              Mark done
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
