# Task 02 — Today: habit and metric logging

Ship gate. After this works end to end, the product can ship; later tasks are additive.

## Work

- Today is a chronological list of what to log today. Next item highlighted.
- Item types in this task: habit (one tap) and metric (one number). Protein is a manual metric number, not a meal log. Session items may appear as links but Train is task 06.
- Each log writes a row and stored provenance. Trace block reads that payload; it does not recompute.
- Under 5 seconds, never leaves the screen.
- Preserve existing `habit_events`, `morning_entries`, `bodyweight_logs`, and related rows.

## Done when

- A unit test logs a habit and a metric and asserts the stored provenance contains `rule_id`, rule version, and the ids of the rows read or written.
- An e2e: open Today → log the highlighted habit (tap) → see it confirmed → log a metric number → see it confirmed. Both rows show a trace affordance that expands to a monospace block naming a rule id and a row id.
- A user can complete "open app, log something, see it reflected, get told what to do next" without opening another tab (next item highlight after the log).

## Not this task

Coach sheet, Progress, Train set logging, food UI.
