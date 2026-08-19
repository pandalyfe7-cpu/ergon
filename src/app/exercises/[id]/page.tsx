import Link from "next/link";
import { notFound } from "next/navigation";

import { ExerciseEditor } from "@/components/exercises/exercise-editor";
import { getExercise } from "@/lib/data";

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = await getExercise(id);
  if (!exercise) notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <h1 className="mb-4 truncate text-lg font-semibold">{exercise.name}</h1>
      <ExerciseEditor exercise={exercise} />
      <Link
        href="/exercises"
        className="text-fg-dim hover:text-fg mt-4 inline-block text-xs underline"
      >
        Back
      </Link>
    </main>
  );
}
