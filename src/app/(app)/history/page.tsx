import Link from "next/link";

import { Card } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { getSessionHistory, PREVIEW_COUNT } from "@/lib/history/data";
import { formatElapsed } from "@/lib/time";

export default async function HistoryPage() {
  const sessions = await getSessionHistory();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-12">
      <header className="mb-5">
        <h1 className="text-text-hi text-xl font-semibold">History</h1>
        <p className="text-text-mid mt-0.5 text-sm">
          Past sessions. Open one to edit its sets.
        </p>
      </header>

      {sessions.length === 0 ? (
        <Card>
          <p className="text-text-hi text-sm font-medium">No finished sessions yet.</p>
          <p className="text-text-mid mt-1 text-sm">
            Start today&apos;s rotation session on{" "}
            <Link href="/" className="text-accent hover:underline">
              Today
            </Link>{" "}
            and it will land here when you finish it.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {sessions.map((summary, index) => {
            const preview = summary.exercises.slice(0, PREVIEW_COUNT);
            const hidden = summary.exercises.length - preview.length;

            return (
              <li
                key={summary.session.id}
                className="enter-rise"
                style={{ "--stagger-i": index } as React.CSSProperties}
              >
                <Link
                  href={`/history/${summary.session.id}`}
                  className="border-border bg-surface hover:bg-surface-2 rounded-card block border p-4 transition-colors duration-120"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-text-hi text-sm font-medium">
                      {summary.name}
                      <span className="text-text-mid font-normal"> · {summary.dateLabel}</span>
                    </span>
                    <span className="num text-text-low text-xs">
                      {formatElapsed(summary.durationMs)}
                    </span>
                  </div>

                  <p className="num text-text-hi mt-1 text-sm">
                    {formatNumber(Math.round(summary.volume))}
                    <span className="text-text-mid text-xs"> lb volume</span>
                  </p>

                  {preview.length === 0 ? (
                    <p className="text-text-low mt-2 text-xs">No sets logged.</p>
                  ) : (
                    <ul className="text-text-mid mt-2 space-y-0.5">
                      {preview.map((exercise) => (
                        <li
                          key={exercise.id}
                          className="flex items-baseline justify-between gap-3 text-xs"
                        >
                          <span className="min-w-0 truncate">{exercise.name}</span>
                          <span className="num shrink-0">
                            {exercise.sets} {exercise.sets === 1 ? "set" : "sets"}
                          </span>
                        </li>
                      ))}
                      {hidden > 0 ? (
                        <li className="text-accent pt-0.5 text-xs">
                          {hidden} more
                        </li>
                      ) : null}
                    </ul>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
