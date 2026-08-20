"use client";

/**
 * One recommendation card, used by Today (primary) and Guidance (full list).
 * Accept / snooze / dismiss update optimistically and roll back on failure
 * with a retry toast. The trace ("Why") shows rule ids and the rows they read.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useToast } from "@/components/toast";
import { Button, Chip, cx } from "@/components/ui";
import { call } from "@/lib/client/call";
import { actOnRecommendation } from "@/lib/ergos/actions";
import {
  DISMISS_REASON_LABELS,
  DISMISS_REASONS,
  type DismissReason,
  type Recommendation,
} from "@/lib/types";

const KIND_LABELS: Record<Recommendation["action_kind"], string> = {
  session: "Session",
  habit: "Habit",
  recovery: "Recovery",
  rest: "Rest",
  metric: "Metric",
};

export function RecCard({
  rec,
  primary = false,
}: {
  rec: Recommendation;
  primary?: boolean;
}) {
  const router = useRouter();
  const { fail, toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [showDismiss, setShowDismiss] = useState(false);

  function act(action: "accepted" | "dismissed" | "snoozed", reason?: DismissReason) {
    setHidden(true);
    setShowDismiss(false);
    startTransition(async () => {
      const result = await call(actOnRecommendation(rec.id, action, reason));
      if ("error" in result) {
        setHidden(false);
        fail(`Could not ${action === "accepted" ? "accept" : action.replace(/d$/, "")}: ${result.error}`, () =>
          act(action, reason),
        );
        return;
      }
      if (action === "accepted") toast("Accepted");
      if (action === "snoozed") toast("Snoozed for 3 hours");
      if (action === "dismissed") toast("Dismissed");
      router.refresh();
    });
  }

  if (hidden) return null;

  return (
    <article
      className={cx(
        "border-border bg-surface rounded-card border p-4",
        primary && "border-accent/40",
      )}
      aria-label={rec.title}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cx("text-text-hi font-semibold", primary ? "text-base" : "text-sm")}>
            {rec.title}
          </h3>
          <p className="text-text-mid mt-1 text-sm">{rec.reason}</p>
        </div>
        <Chip tone="mid" className="shrink-0">
          {rec.est_minutes} min
        </Chip>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Chip tone="accent">{KIND_LABELS[rec.action_kind]}</Chip>
        {rec.moves && <Chip tone="mid">moves {rec.moves}</Chip>}
        {rec.rule_ids.map((ruleId) => (
          <Chip key={ruleId} tone="mid">
            {ruleId}
          </Chip>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant={primary ? "primary" : "secondary"}
          disabled={pending}
          onClick={() => act("accepted")}
          className="px-3 py-1.5"
        >
          Accept
        </Button>
        <Button
          variant="quiet"
          disabled={pending}
          onClick={() => act("snoozed")}
          className="px-2 py-1.5"
        >
          Snooze
        </Button>
        <div className="relative">
          <Button
            variant="quiet"
            disabled={pending}
            onClick={() => setShowDismiss((v) => !v)}
            className="px-2 py-1.5"
            aria-expanded={showDismiss}
          >
            Dismiss
          </Button>
          {showDismiss && (
            <div className="border-border bg-surface-2 shadow-overlay rounded-card absolute left-0 z-10 mt-1 w-44 border p-1">
              {DISMISS_REASONS.map((reason) => (
                <button
                  key={reason}
                  className="rounded-control text-text-mid hover:bg-surface hover:text-text-hi block w-full px-2.5 py-1.5 text-left text-sm"
                  onClick={() => act("dismissed", reason)}
                >
                  {DISMISS_REASON_LABELS[reason]}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="quiet"
          onClick={() => setShowTrace((v) => !v)}
          className="ml-auto px-2 py-1.5"
          aria-expanded={showTrace}
        >
          Why
        </Button>
      </div>

      {showTrace && (
        <div className="border-border mt-3 border-t pt-3">
          <ul className="space-y-2">
            {rec.trace.map((entry, index) => (
              <li key={index} className="text-xs">
                <span className="num text-accent">{entry.rule_id}</span>{" "}
                <span className="text-text-mid">{entry.detail}</span>
                {entry.rows.length > 0 && (
                  <div className="num text-text-low mt-0.5">
                    reads: {entry.rows.join("; ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="num text-text-low mt-2 text-xs">
            engine {rec.engine_version} · score {Number(rec.score).toFixed(2)}
          </p>
        </div>
      )}
    </article>
  );
}
