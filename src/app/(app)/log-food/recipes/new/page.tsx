import Link from "next/link";

import { RecipeEditor } from "@/components/food/recipe-editor";
import { getFoods } from "@/lib/food/data";

export default async function NewRecipePage() {
  const foods = await getFoods();

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-12">
      <header className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="text-text-hi text-xl font-semibold">New recipe</h1>
        <Link href="/log-food/recipes" className="text-accent text-sm hover:underline">
          Recipes
        </Link>
      </header>

      <RecipeEditor recipe={null} foods={foods} />
    </div>
  );
}
