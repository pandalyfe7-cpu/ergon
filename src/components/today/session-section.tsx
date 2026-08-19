"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Elapsed } from "@/components/elapsed";
import { Button, buttonClass, Panel, SectionLabel } from "@/components/ui";
import { startSession } from "@/lib/actions";
import type { ExerciseTemplate, Session } from "@/lib/types";

export function SessionSection({
  openSession,
  templates,
}: {
  openSession: Session | null;
  templates: ExerciseTemplate[];
}) {
  const [picking, setPicking] = useState(false);
  const [pending, start] = useTransition();

  if (openSession) {
    return (
      <section className="border-accent bg-surface flex items-center justify-between rounded-lg border p-4">
        <div>
          <SectionLabel>In progress</SectionLabel>
          <Elapsed since={openSession.started_at} className="num mt-1 block text-2xl" />
        </div>
        <Link href="/workout" className={buttonClass("primary")}>
          Resume workout
        </Link>
      </section>
    );
  }

  const begin = (templateId: string | null) => {
    start(() => {
      void startSession(templateId);
    });
  };

  if (!picking) {
    return (
      <Panel>
        <SectionLabel>Training</SectionLabel>
        <Button
          variant="primary"
          className="mt-3 w-full"
          onClick={() => setPicking(true)}
        >
          Start workout
        </Button>
      </Panel>
    );
  }

  return (
    <Panel>
      <SectionLabel>Pick a routine</SectionLabel>

      <ul className="mt-3 space-y-2">
        {templates.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() => begin(template.id)}
              className="border-border hover:border-border-strong flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm disabled:opacity-40"
            >
              <span>{template.name}</span>
              <span className="num text-fg-dim text-xs">
                {template.exercises.length}
              </span>
            </button>
          </li>
        ))}

        {templates.length === 0 ? (
          <li className="text-fg-dim text-xs">No routines yet.</li>
        ) : null}

        <li>
          <Button
            variant="primary"
            className="w-full"
            disabled={pending}
            onClick={() => begin(null)}
          >
            Freestyle
          </Button>
        </li>
      </ul>

      <div className="mt-3 flex items-center justify-between">
        <Link href="/routines" className="text-fg-dim hover:text-fg text-xs underline">
          Manage routines
        </Link>
        <button
          type="button"
          onClick={() => setPicking(false)}
          className="text-fg-dim hover:text-fg text-xs"
        >
          Cancel
        </button>
      </div>
    </Panel>
  );
}
