# Task 01 — Onboarding and intake scoring

Deterministic. No LLM.

## Work

- First-run flow: goals (max 3) → fixed intake → deterministic plan → Today.
- Nothing else reachable until onboarding is complete.
- Intake dimensions: barrier and motivator codes in `supabase/migrations/20260821000000_user_intake.sql`. Question wording is stubbed in [PRODUCT-SPEC.md](../PRODUCT-SPEC.md); do not invent copy.
- Numeric score per dimension, stored with provenance (`rule_id`, rule version, row ids).
- Plan generation: habits with frequency and initial four-state assignment, metrics to track, training template if a training goal exists.
- Constraint gate last on the plan; may remove or modify; never add.
- Multi-user: every new table `user_id` + RLS. No personal facts in application code.
- Stop seeding `seed/constraints.json` to new users. Owner constraints load only from `seed/personal.sql` (gitignored) when the owner chooses. New users get no medical constraint rows unless they enter them. Fake shape: `seed/example.sql`.
- Preserve existing rows. Do not wipe logs, sessions, or habit events.

## Done when

- A unit test creates a user with goals + intake scores + constraint rows and asserts a non-empty plan, four-state assignments, and stored provenance on each score.
- A test proves the constraint gate ran last (a gated-out item is absent from the plan and is not re-added by a later step).
- A test (or seed-path assertion) proves **`seed/constraints.json` is no longer seeded to new users**.
- An e2e (or equivalent) proves a new user cannot open Today, Progress, Train, or Settings until onboarding finishes, and reaches Today with a non-empty plan.

## Not this task

Coach, quizzes, Train UI, Today list UI beyond whatever onboarding needs to land on Today.
