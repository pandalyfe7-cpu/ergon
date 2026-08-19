import Link from "next/link";

import { RoutineEditor } from "@/components/routines/routine-editor";
import { getExercises } from "@/lib/data";

export default async function NewRoutinePage() {
  const library = await getExercises();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <h1 className="mb-4 text-lg font-semibold">New routine</h1>
      <RoutineEditor template={null} library={library} />
      <Link
        href="/routines"
        className="text-fg-dim hover:text-fg mt-4 inline-block text-xs underline"
      >
        Back
      </Link>
    </main>
  );
}
