import Link from "next/link";

import { DescribeMeal } from "@/components/food/describe-meal";
import { getTimeZone } from "@/lib/data";
import { inferMealSlot } from "@/lib/food/slots";

export default async function DescribeMealPage() {
  const defaultSlot = inferMealSlot(await getTimeZone());

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Describe a meal</h1>
        <Link href="/log-food" className="text-fg-dim hover:text-fg text-xs underline">
          Back
        </Link>
      </header>

      <DescribeMeal defaultSlot={defaultSlot} />
    </main>
  );
}
