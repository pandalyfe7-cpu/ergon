import Link from "next/link";

import { RecipeEditor } from "@/components/food/recipe-editor";
import { getFoods } from "@/lib/food/data";

export default async function NewRecipePage() {
  const foods = await getFoods();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">New recipe</h1>
        <Link
          href="/log-food/recipes"
          className="text-fg-dim hover:text-fg text-xs underline"
        >
          Back
        </Link>
      </header>

      <RecipeEditor recipe={null} foods={foods} />
    </main>
  );
}
