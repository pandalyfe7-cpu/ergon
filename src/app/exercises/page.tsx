import Link from "next/link";

import { ExerciseList } from "@/components/exercises/exercise-list";
import { buttonClass } from "@/components/ui";
import { getExercises } from "@/lib/data";

export default async function ExercisesPage() {
  const exercises = await getExercises();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Exercises</h1>
        <Link href="/exercises/new" className={buttonClass("primary")}>
          New exercise
        </Link>
      </header>

      <ExerciseList exercises={exercises} />

      <Link
        href="/routines"
        className="text-fg-dim hover:text-fg mt-4 inline-block text-xs underline"
      >
        Routines
      </Link>
    </main>
  );
}
