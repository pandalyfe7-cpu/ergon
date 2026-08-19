"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { SectionLabel, TextField } from "@/components/ui";
import { createLoggedMeal } from "@/lib/food/actions";
import { formatNumber } from "@/lib/format";
import type { Food } from "@/lib/types";

const SEARCH_LIMIT = 8;

/**
 * Recents, saved, and search all log the tapped food at serving 1 into the
 * slot inferred from the current time. Today's log below is where it gets
 * adjusted afterwards.
 */
export function QuickLog({
  recents,
  saved,
  foods,
}: {
  recents: Food[];
  saved: Food[];
  foods: Food[];
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return foods
      .filter((food) => food.name.toLowerCase().includes(needle))
      .slice(0, SEARCH_LIMIT);
  }, [foods, query]);

  function log(food: Food) {
    setError(null);
    startTransition(async () => {
      const result = await createLoggedMeal({ food_id: food.id, serving: 1 });
      if ("error" in result) setError(result.error);
      else setQuery("");
    });
  }

  return (
    <div className="space-y-4">
      <ChipRow label="Recents" foods={recents} disabled={pending} onLog={log} />
      <ChipRow label="Saved" foods={saved} disabled={pending} onLog={log} />

      <div>
        <SectionLabel>Search</SectionLabel>
        <TextField
          type="search"
          value={query}
          placeholder="Food name"
          aria-label="Search foods"
          onChange={(event) => setQuery(event.target.value)}
          className="mt-2"
        />

        {query.trim() ? (
          matches.length > 0 ? (
            <ul className="border-border divide-border mt-2 divide-y rounded-md border">
              {matches.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => log(food)}
                    className="hover:bg-surface-raised flex w-full items-center justify-between gap-3 px-3 py-2 text-left disabled:opacity-40"
                  >
                    <span className="text-sm leading-tight">{food.name}</span>
                    <span className="text-fg-dim num shrink-0 text-xs">
                      {formatNumber(food.calories)} kcal
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-fg-dim mt-2 text-xs">
              No match.{" "}
              <Link href="/log-food/new" className="text-accent underline">
                New food
              </Link>
            </p>
          )
        ) : null}
      </div>

      {error ? <p className="text-status-red text-xs">{error}</p> : null}
    </div>
  );
}

function ChipRow({
  label,
  foods,
  disabled,
  onLog,
}: {
  label: string;
  foods: Food[];
  disabled: boolean;
  onLog: (food: Food) => void;
}) {
  if (foods.length === 0) return null;

  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <ul className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {foods.map((food) => (
          <li key={food.id} className="shrink-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onLog(food)}
              className="border-border bg-surface-raised hover:border-border-strong flex h-full w-32 flex-col justify-between gap-2 rounded-md border p-2 text-left disabled:opacity-40"
            >
              <span className="line-clamp-2 text-xs leading-tight">{food.name}</span>
              <span className="text-fg-dim num text-[11px]">
                {formatNumber(food.calories)} kcal
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
