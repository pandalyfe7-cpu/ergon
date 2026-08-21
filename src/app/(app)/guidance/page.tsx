import { RecCard } from "@/components/rec-card";
import { Card, Chip, SectionLabel } from "@/components/ui";
import { getErgosContext } from "@/lib/ergos/data";
import {
  getWeeklyRuleFeedback,
  refreshRecommendations,
} from "@/lib/ergos/recommendations";
import { DISMISS_REASON_LABELS, type DismissReason } from "@/lib/types";

export default async function GuidancePage() {
  const ctx = await getErgosContext();
  // Sequential: feedback reads the rows the refresh just wrote.
  const { rows, output, actedOn } = await refreshRecommendations(ctx);
  const feedback = await getWeeklyRuleFeedback(ctx);
  const totalShown = feedback.reduce((n, row) => n + row.shown, 0);

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <header className="mb-5">
        <h1 className="text-text-hi text-xl font-semibold">Guidance</h1>
        <p className="text-text-mid mt-0.5 max-w-[75ch] text-sm">
          Everything worth doing right now, ranked. Every card shows its data.
        </p>
      </header>

      <div className="space-y-4">
        {output.coldStart && (
          <Card className="max-w-[75ch]">
            <SectionLabel>Cold start</SectionLabel>
            <p className="text-text-mid mt-2 text-sm">
              Under two weeks of history: only the next rotation session and the
              most overdue habit are recommended until scoring has enough data.
            </p>
            <ul className="mt-2 space-y-1">
              {output.waitingOn.map((line) => (
                <li key={line} className="text-text-low text-xs">
                  · {line}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {rows.length === 0 ? (
          <Card className="max-w-[75ch]">
            <p className="text-text-hi text-sm font-medium">Nothing pressing.</p>
            <p className="text-text-mid mt-1 text-sm">
              No action scores above the threshold right now. That is a fine
              place to be.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {rows.map((rec, index) => (
              <li
                key={rec.id}
                className="enter-rise max-w-[75ch]"
                style={{ "--stagger-i": index } as React.CSSProperties}
              >
                {index === 0 && (
                  <div className="mb-2">
                    <SectionLabel>Primary</SectionLabel>
                  </div>
                )}
                {index === 1 && (
                  <div className="mb-2">
                    <SectionLabel>Also worth doing</SectionLabel>
                  </div>
                )}
                <RecCard rec={rec} primary={index === 0} />
              </li>
            ))}
          </ul>
        )}

        {actedOn.length > 0 && (
          <section>
            <SectionLabel>Acted on today</SectionLabel>
            <ul className="mt-2 space-y-1.5">
              {actedOn.map((rec) => (
                <li
                  key={rec.id}
                  className="border-border bg-surface rounded-control flex items-center justify-between gap-3 border px-3 py-2"
                >
                  <span className="text-text-mid min-w-0 truncate text-sm">{rec.title}</span>
                  <Chip
                    tone={
                      rec.status === "accepted"
                        ? "positive"
                        : rec.status === "dismissed"
                          ? "negative"
                          : "warning"
                    }
                  >
                    {rec.status}
                    {rec.dismiss_reason
                      ? ` · ${DISMISS_REASON_LABELS[rec.dismiss_reason as DismissReason]}`
                      : ""}
                  </Chip>
                </li>
              ))}
            </ul>
          </section>
        )}

        {totalShown >= 10 ? (
          <section>
            <SectionLabel>Rule feedback, last 7 days</SectionLabel>
            <table className="num mt-2 w-full text-sm">
              <thead>
                <tr className="text-text-low text-left text-xs">
                  <th className="py-1.5 font-normal">rule</th>
                  <th className="py-1.5 text-right font-normal">shown</th>
                  <th className="py-1.5 text-right font-normal">accepted</th>
                  <th className="py-1.5 text-right font-normal">dismissed</th>
                  <th className="py-1.5 text-right font-normal">ignored</th>
                </tr>
              </thead>
              <tbody>
                {feedback.map((row) => (
                  <tr key={row.rule_id} className="border-border border-t">
                    <td className="text-accent py-1.5">{row.rule_id}</td>
                    <td className="text-text-hi py-1.5 text-right">{row.shown}</td>
                    <td className="text-text-hi py-1.5 text-right">{row.accepted}</td>
                    <td className="text-text-hi py-1.5 text-right">{row.dismissed}</td>
                    <td className="text-text-hi py-1.5 text-right">{row.ignored}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-text-low mt-2 text-xs">
              Weights never adjust themselves; tune them in Settings if a rule
              keeps producing cards you ignore.
            </p>
          </section>
        ) : (
          <p className="text-text-mid max-w-[75ch] text-sm">
            Rule feedback appears once rules have been shown 10 times.
          </p>
        )}
      </div>
    </div>
  );
}
