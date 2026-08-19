import Link from "next/link";

import { ExerciseEditor } from "@/components/exercises/exercise-editor";

export default function NewExercisePage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <h1 className="mb-4 text-lg font-semibold">New exercise</h1>
      <ExerciseEditor exercise={null} />
      <Link
        href="/exercises"
        className="text-fg-dim hover:text-fg mt-4 inline-block text-xs underline"
      >
        Back
      </Link>
    </main>
  );
}
