# Ergon

A single-user training and nutrition log. Next.js (App Router), TypeScript,
Tailwind, Supabase.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in from Supabase: Project Settings -> API
npm run dev
```

Apply the schema to your Supabase project either with the CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

or by pasting `supabase/migrations/20260728000000_foundation.sql` into the SQL
editor in the dashboard.

Every table has row level security restricted to the owning user, and `user_id`
defaults to `auth.uid()`, so you must be signed in for reads and writes to
return anything.

`ANTHROPIC_API_KEY` is optional. Only "describe a meal" uses it, and without it
that screen says so instead of failing quietly.

## Layout

| Path                          | What lives there                                        |
| ----------------------------- | ------------------------------------------------------- |
| `src/lib/types/`              | Entity types, enums, constraint system, schema type      |
| `src/lib/design/tokens.ts`    | Color tokens, mirrored in `src/app/globals.css`          |
| `src/lib/supabase/`           | Browser and server clients, typed against the schema     |
| `src/lib/food/`               | Macro math, meal slots, food reads, food actions         |
| `src/lib/training/`           | Progression, set helpers, stimulus, personal records     |
| `src/lib/body/`               | Week and trend reads for the body tab                    |
| `src/lib/coach/`              | Recommendations, decision log writes and session links   |
| `src/lib/progress/`           | Streak, adherence, and daily series for the progress tab |
| `src/lib/history/`            | Past session summaries and per-session detail            |
| `supabase/migrations/`        | Postgres schema                                          |

Import the data model from a single path:

```ts
import type { Exercise, LoggedSet, MuscleGroup } from "@/lib/types";
import { formatConstraintBadge } from "@/lib/types";
```

## Conventions

- Units are named in the field: `_lb` for loads and bodyweight, `_g` for macros,
  `_ml` for water. Nothing is stored in two units.
- Colors come from the tokens only. `accent` is for active states and the single
  primary action of a screen; the three status colors appear only where they
  carry their status meaning.
- Numbers render with the `num` utility class, which sets the monospace face and
  tabular figures.
