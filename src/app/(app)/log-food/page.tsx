import Link from "next/link";

import { QuickLog } from "@/components/food/quick-log";
import { TodayLog } from "@/components/food/today-log";
import { buttonClass } from "@/components/ui";
import { getFoodLogData } from "@/lib/food/data";

const ACTIONS = [
  { href: "/log-food/describe", label: "Describe a meal" },
  { href: "/log-food/new", label: "New food" },
  { href: "/log-food/recipes", label: "Build a recipe" },
];

export default async function LogFoodPage() {
  const { recents, saved, foods, today } = await getFoodLogData();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Log food</h1>
        <Link href="/" className="text-fg-dim hover:text-fg text-xs underline">
          Today
        </Link>
      </header>

      <QuickLog recents={recents} saved={saved} foods={foods} />

      <div className="mt-4 grid gap-2">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={buttonClass("secondary", "text-center")}
          >
            {action.label}
          </Link>
        ))}
      </div>

      <section className="border-border mt-8 border-t pt-4">
        <h2 className="mb-3 text-sm font-semibold">Today</h2>
        <TodayLog rows={today} />
      </section>
    </main>
  );
}
