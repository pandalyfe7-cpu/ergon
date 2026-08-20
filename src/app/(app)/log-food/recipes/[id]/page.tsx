import Link from "next/link";
import { notFound } from "next/navigation";

import { RecipeEditor } from "@/components/food/recipe-editor";
import { getFoods, getRecipe } from "@/lib/food/data";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [recipe, foods] = await Promise.all([getRecipe(id), getFoods()]);
  if (!recipe) notFound();

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-12">
      <header className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="text-text-hi truncate text-xl font-semibold">{recipe.name}</h1>
        <Link href="/log-food/recipes" className="text-accent shrink-0 text-sm hover:underline">
          Recipes
        </Link>
      </header>

      <RecipeEditor recipe={recipe} foods={foods} />
    </div>
  );
}
