import Link from "next/link";

import { DescribeMeal } from "@/components/food/describe-meal";
import { getTimeZone } from "@/lib/data";
import { inferMealSlot } from "@/lib/food/slots";

export default async function DescribeMealPage() {
  const defaultSlot = inferMealSlot(await getTimeZone());

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-12">
      <header className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="text-text-hi text-xl font-semibold">Describe a meal</h1>
        <Link href="/log-food" className="text-accent text-sm hover:underline">
          Food
        </Link>
      </header>

      <DescribeMeal defaultSlot={defaultSlot} />
    </div>
  );
}
