import Link from "next/link";

import { RecipeList } from "@/components/food/recipe-list";
import { buttonClass } from "@/components/ui";
import { getFoods, getRecipes } from "@/lib/food/data";

export default async function RecipesPage() {
  const [recipes, foods] = await Promise.all([getRecipes(), getFoods()]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Recipes</h1>
        <Link href="/log-food/recipes/new" className={buttonClass("primary")}>
          New recipe
        </Link>
      </header>

      <RecipeList recipes={recipes} foods={foods} />

      <Link
        href="/log-food"
        className="text-fg-dim hover:text-fg mt-4 inline-block text-xs underline"
      >
        Back
      </Link>
    </main>
  );
}
