"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { useToast } from "@/components/toast";
import { SectionLabel, TextField } from "@/components/ui";
import { call } from "@/lib/client/call";
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
  const { fail, toast } = useToast();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return foods
      .filter((food) => food.name.toLowerCase().includes(needle))
      .slice(0, SEARCH_LIMIT);
  }, [foods, query]);

  function log(food: Food) {
    startTransition(async () => {
      const result = await call(createLoggedMeal({ food_id: food.id, serving: 1 }));
      if ("error" in result) {
        fail(`Not logged: ${result.error}`, () => log(food));
        return;
      }
      toast(`${food.name} logged`);
      setQuery("");
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
          className="mt-2 w-full"
        />

        {query.trim() ? (
          matches.length > 0 ? (
            <ul className="border-border divide-border rounded-card mt-2 divide-y border">
              {matches.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => log(food)}
                    className="hover:bg-surface-2 flex w-full items-center justify-between gap-3 px-3 py-2 text-left disabled:opacity-40"
                  >
                    <span className="text-text-hi text-sm leading-tight">{food.name}</span>
                    <span className="text-text-low num shrink-0 text-xs">
                      {formatNumber(food.protein_g)} g P · {formatNumber(food.calories)} kcal
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-mid mt-2 text-xs">
              No match.{" "}
              <Link href="/log-food/new" className="text-accent hover:underline">
                New food
              </Link>
            </p>
          )
        ) : null}
      </div>
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
              className="border-border bg-surface hover:bg-surface-2 rounded-control flex h-full w-32 flex-col justify-between gap-2 border p-2 text-left transition-colors duration-120 disabled:opacity-40"
            >
              <span className="text-text-hi line-clamp-2 text-xs leading-tight">
                {food.name}
              </span>
              <span className="text-text-low num text-[11px]">
                {formatNumber(food.protein_g)} g P · {formatNumber(food.calories)} kcal
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
