import Link from "next/link";

import { RecipeList } from "@/components/food/recipe-list";
import { buttonClass } from "@/components/ui";
import { getFoods, getRecipes } from "@/lib/food/data";

export default async function RecipesPage() {
  const [recipes, foods] = await Promise.all([getRecipes(), getFoods()]);

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-12">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-text-hi text-xl font-semibold">Recipes</h1>
          <Link href="/log-food" className="text-accent text-sm hover:underline">
            Food
          </Link>
        </div>
        <Link href="/log-food/recipes/new" className={buttonClass("primary")}>
          New recipe
        </Link>
      </header>

      <RecipeList recipes={recipes} foods={foods} />
    </div>
  );
}
