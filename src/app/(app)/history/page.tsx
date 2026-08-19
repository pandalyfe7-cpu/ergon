import Link from "next/link";

import { getSessionHistory, PREVIEW_COUNT } from "@/lib/history/data";
import { formatNumber } from "@/lib/format";
import { formatElapsed } from "@/lib/time";

export default async function HistoryPage() {
  const sessions = await getSessionHistory();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">History</h1>
        <Link href="/" className="text-fg-dim hover:text-fg text-xs underline">
          Today
        </Link>
      </header>

      {sessions.length === 0 ? (
        <p className="text-fg-dim text-sm">No finished sessions yet.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((summary) => {
            const preview = summary.exercises.slice(0, PREVIEW_COUNT);
            const hidden = summary.exercises.length - preview.length;

            return (
              <li key={summary.session.id}>
                <Link
                  href={`/history/${summary.session.id}`}
                  className="border-border bg-surface hover:border-border-strong block rounded-lg border p-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{summary.dateLabel}</span>
                    <span className="num text-fg-dim text-[11px]">
                      {formatElapsed(summary.durationMs)}
                    </span>
                  </div>

                  <p className="num mt-1 text-sm">
                    {formatNumber(Math.round(summary.volume))}
                    <span className="text-fg-dim text-[11px]"> lb volume</span>
                  </p>

                  {preview.length === 0 ? (
                    <p className="text-fg-dim mt-2 text-[11px]">No sets logged.</p>
                  ) : (
                    <ul className="text-fg-dim mt-2 space-y-0.5">
                      {preview.map((exercise) => (
                        <li
                          key={exercise.id}
                          className="flex items-baseline justify-between gap-3 text-[11px]"
                        >
                          <span className="min-w-0 truncate">{exercise.name}</span>
                          <span className="num shrink-0">
                            {exercise.sets} {exercise.sets === 1 ? "set" : "sets"}
                          </span>
                        </li>
                      ))}
                      {hidden > 0 ? (
                        <li className="text-fg pt-0.5 text-[11px] underline">See all</li>
                      ) : null}
                    </ul>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
