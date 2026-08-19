import Link from "next/link";

import { buttonClass } from "@/components/ui";
import { getExercises, getTemplates } from "@/lib/data";

const PREVIEW_COUNT = 3;

export default async function RoutinesPage() {
  const [templates, exercises] = await Promise.all([getTemplates(), getExercises()]);
  const nameById = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Routines</h1>
        <Link href="/routines/new" className={buttonClass("primary")}>
          New routine
        </Link>
      </header>

      {templates.length === 0 ? (
        <p className="text-fg-dim text-sm">No routines yet.</p>
      ) : (
        <ul className="space-y-2">
          {templates.map((template) => {
            const names = template.exercises
              .map((row) => nameById.get(row.exercise_id))
              .filter((name): name is string => Boolean(name));
            const totalSets = template.exercises.reduce(
              (sum, row) => sum + row.prescribed_sets,
              0,
            );
            const hidden = names.length - PREVIEW_COUNT;

            return (
              <li key={template.id}>
                <Link
                  href={`/routines/${template.id}`}
                  className="border-border bg-surface hover:border-border-strong block rounded-lg border p-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm">{template.name}</span>
                    <span className="num text-fg-dim shrink-0 text-[11px]">
                      {template.exercises.length} ex · {totalSets} sets
                    </span>
                  </div>
                  <p className="text-fg-dim mt-1 truncate text-[11px]">
                    {names.slice(0, PREVIEW_COUNT).join(", ")}
                    {hidden > 0 ? `, see ${hidden} more` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/exercises"
        className="text-fg-dim hover:text-fg mt-4 inline-block text-xs underline"
      >
        Exercises
      </Link>
    </main>
  );
}
