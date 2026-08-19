import { Meter, SECTION_LABEL_CLASS } from "@/components/ui";
import type { MacroTotals } from "@/lib/food/macros";
import { formatNumber, formatSigned } from "@/lib/format";
import type { DailyMacroTarget } from "@/lib/types";

export function MacroStatus({
  target,
  consumed,
}: {
  target: DailyMacroTarget;
  consumed: MacroTotals;
}) {
  const caloriesLeft = target.calories - consumed.calories;

  const macros = [
    { label: "Protein", used: consumed.protein_g, max: target.protein_g },
    { label: "Carbs", used: consumed.carbs_g, max: target.carbs_g },
    { label: "Fat", used: consumed.fat_g, max: target.fat_g },
  ];

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span
          className={`num text-4xl leading-none ${caloriesLeft < 0 ? "text-status-red" : "text-fg"}`}
        >
          {formatSigned(caloriesLeft)}
        </span>
        <span className={SECTION_LABEL_CLASS}>Cal left</span>
      </div>

      <Meter
        value={consumed.calories}
        max={target.calories}
        tone={caloriesLeft < 0 ? "over" : "neutral"}
      />

      <div className="mt-4 grid grid-cols-3 gap-3">
        {macros.map((macro) => {
          const left = macro.max - macro.used;
          return (
            <div key={macro.label}>
              <div className="mb-1 flex items-baseline justify-between gap-1">
                <span className="text-fg-dim text-[11px]">{macro.label}</span>
                <span
                  className={`num text-xs ${left < 0 ? "text-status-red" : "text-fg"}`}
                >
                  {formatSigned(left)}g
                </span>
              </div>
              <Meter
                value={macro.used}
                max={macro.max}
                tone={left < 0 ? "over" : "neutral"}
              />
            </div>
          );
        })}
      </div>

      <p className="text-fg-dim mt-3 text-[11px]">
        <span className="num">{formatNumber(consumed.calories)}</span> of{" "}
        <span className="num">{formatNumber(target.calories)}</span> logged
      </p>
    </div>
  );
}
