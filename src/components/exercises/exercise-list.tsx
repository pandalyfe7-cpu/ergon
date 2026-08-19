"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ConstraintBadges, TextField } from "@/components/ui";
import { formatMuscleGroup } from "@/lib/format";
import type { Exercise } from "@/lib/types";

export function ExerciseList({ exercises }: { exercises: Exercise[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return exercises;
    return exercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(needle),
    );
  }, [exercises, query]);

  return (
    <div className="space-y-3">
      <TextField
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search"
        aria-label="Search exercises"
      />

      {visible.length === 0 ? (
        <p className="text-fg-dim text-sm">
          {exercises.length === 0 ? "No exercises yet." : "No matches."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((exercise) => {
            const muscles = Object.keys(exercise.stimulus_weights);
            return (
              <li key={exercise.id}>
                <Link
                  href={`/exercises/${exercise.id}`}
                  className="border-border bg-surface hover:border-border-strong block rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm">{exercise.name}</span>
                    <ConstraintBadges constraints={exercise.constraints} />
                  </div>
                  {muscles.length > 0 ? (
                    <p className="text-fg-dim mt-1 truncate text-[11px]">
                      {muscles.map(formatMuscleGroup).join(", ")}
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
