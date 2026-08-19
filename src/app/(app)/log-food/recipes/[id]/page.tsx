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
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <h1 className="mb-4 truncate text-lg font-semibold">{recipe.name}</h1>
      <RecipeEditor recipe={recipe} foods={foods} />
      <Link
        href="/log-food/recipes"
        className="text-fg-dim hover:text-fg mt-4 inline-block text-xs underline"
      >
        Back
      </Link>
    </main>
  );
}
