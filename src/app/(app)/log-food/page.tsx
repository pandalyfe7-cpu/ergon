import Link from "next/link";

import { QuickLog } from "@/components/food/quick-log";
import { TodayLog } from "@/components/food/today-log";
import { Card, cx, SectionLabel } from "@/components/ui";
import { requireUser } from "@/lib/data";
import { getFoodLogData } from "@/lib/food/data";
import { sumFoodQuantities } from "@/lib/food/macros";
import { formatNumber } from "@/lib/format";

const ACTIONS = [
  { href: "/log-food/describe", label: "Describe a meal" },
  { href: "/log-food/new", label: "New food" },
  { href: "/log-food/recipes", label: "Recipes" },
];

export default async function LogFoodPage() {
  const { recents, saved, foods, today } = await getFoodLogData();

  const { supabase } = await requireUser();
  const { data: proteinDef } = await supabase
    .from("metric_definitions")
    .select("target")
    .eq("slug", "protein")
    .maybeSingle();
  const proteinFloor = proteinDef?.target.floor ?? null;

  const totals = sumFoodQuantities(
    today.map((row) => ({ food: row.food, quantity: row.meal.serving })),
  );
  const proteinMet = proteinFloor !== null && totals.protein_g >= proteinFloor;

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-12">
      <header className="mb-5">
        <h1 className="text-text-hi text-xl font-semibold">Food</h1>
        <p className="text-text-mid num mt-0.5 text-sm">
          {formatNumber(totals.protein_g)} g protein
          {proteinFloor !== null && (
            <span className={cx(proteinMet ? "text-positive" : "text-text-mid")}>
              {" "}
              of {formatNumber(proteinFloor, 0)} g floor
            </span>
          )}
          {" · "}
          {formatNumber(totals.calories)} kcal today
        </p>
      </header>

      <div className="space-y-4">
        <div className="enter-rise" style={{ "--stagger-i": 0 } as React.CSSProperties}>
          <QuickLog recents={recents} saved={saved} foods={foods} />
        </div>

        <div
          className="enter-rise flex gap-2"
          style={{ "--stagger-i": 1 } as React.CSSProperties}
        >
          {ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="border-border text-text-mid hover:text-text-hi hover:bg-surface-2 rounded-control grow border px-3 py-2 text-center text-sm transition-colors duration-120"
            >
              {action.label}
            </Link>
          ))}
        </div>

        <div className="enter-rise" style={{ "--stagger-i": 2 } as React.CSSProperties}>
          <Card>
            <SectionLabel>Logged today</SectionLabel>
            <div className="mt-2">
              <TodayLog rows={today} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
