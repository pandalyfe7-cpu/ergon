import Link from "next/link";
import { notFound } from "next/navigation";

import { RoutineEditor } from "@/components/routines/routine-editor";
import { getExercises, getTemplate } from "@/lib/data";

export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [template, library] = await Promise.all([getTemplate(id), getExercises()]);
  if (!template) notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <h1 className="mb-4 truncate text-lg font-semibold">{template.name}</h1>
      <RoutineEditor template={template} library={library} />
      <Link
        href="/routines"
        className="text-fg-dim hover:text-fg mt-4 inline-block text-xs underline"
      >
        Back
      </Link>
    </main>
  );
}
