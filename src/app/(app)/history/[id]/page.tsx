import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionEditor } from "@/components/history/session-editor";
import { formatNumber } from "@/lib/format";
import { getSessionDetail } from "@/lib/history/data";
import { formatElapsed } from "@/lib/time";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getSessionDetail(id);
  if (!detail) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-12">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-text-hi text-xl font-semibold">{detail.name}</h1>
          <p className="text-text-mid num mt-0.5 text-sm">
            {detail.dateLabel}
            {" · "}
            {formatElapsed(detail.durationMs)}
            {" · "}
            {formatNumber(Math.round(detail.volume))} lb
          </p>
        </div>
        <Link href="/history" className="text-accent text-sm hover:underline">
          History
        </Link>
      </header>

      {detail.blocks.length === 0 ? (
        <p className="text-text-mid text-sm">No sets were logged in this session.</p>
      ) : (
        <SessionEditor
          sessionId={detail.session.id}
          blocks={detail.blocks.map((block) => ({
            exerciseId: block.exercise.id,
            exerciseName: block.exercise.name,
            sets: block.sets,
            best: block.best,
          }))}
        />
      )}
    </div>
  );
}
