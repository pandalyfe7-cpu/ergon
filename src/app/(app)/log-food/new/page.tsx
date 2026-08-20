import Link from "next/link";

import { FoodForm } from "@/components/food/food-form";
import { getTimeZone } from "@/lib/data";
import { inferMealSlot } from "@/lib/food/slots";

export default async function NewFoodPage() {
  const defaultSlot = inferMealSlot(await getTimeZone());

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-12">
      <header className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="text-text-hi text-xl font-semibold">New food</h1>
        <Link href="/log-food" className="text-accent text-sm hover:underline">
          Food
        </Link>
      </header>

      <FoodForm defaultSlot={defaultSlot} defaultSaved submitLabel="Save and log" />
    </div>
  );
}
