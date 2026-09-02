# Task 06 — Train: templates, constraint gate last, set logging

## Work

- Train tab only if a training goal exists.
- Pick a program from templates: stub `upper-lower-4` (owner fills) and legacy PPL 6-session as data, not as a hardcoded engine spine.
- Constraint gate runs last on the session the template proposes. Gate reads constraint rows. Output carries a stored trace.
- Log sets: load × reps × RPE. Per-lift trend.
- Default next-set aim: existing `prescribeNext` / `getAimFor` (passing tests in `src/lib/engine/__tests__/prescription.test.ts`). Keep that module; do not replace it with an LLM.
- Preserve existing `sessions` and `logged_sets` rows.

## Done when

- Unit test: gate runs last on a fixture session; a blocked movement is absent; provenance includes `gate` and the constraint row ids read.
- Unit test: `prescribeNext` still honors the 10% cap and hold-on-missing-RPE cases (existing tests must keep passing).
- E2e: a user with a training goal opens Train, logs a set (load × reps × RPE), sees it on the session and on a per-lift trend. A user with no training goal has no Train tab.
- Gate trace is visible on the session or lift list.

## Not this task

Food, AI program designer, session-editor UI from the as-built History page.
