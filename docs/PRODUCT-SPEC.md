# ERGOS product spec

To-be product only. Do not copy screens, copy, or navigation from the as-built app. As-built truth is frozen in [AS-BUILT.md](AS-BUILT.md). Visual tokens and component specs are in [ui-constitution.md](ui-constitution.md). Build order is [tasks/00-order.md](tasks/00-order.md).

Existing Supabase project, tables, RLS, and rows are preserved. Logs are not disposable. Migrations must not drop user data.

---

## What ERGOS is

ERGOS is a multi-user habit tracker that reinforces confidence-building behaviors. Training is one habit among them — the strongest "did it even when I did not want to" signal — not the center of the app. The user lives on one screen, Today: a chronological list of what to do and log, with the next expected input highlighted. First run produces goals, an intake, and a deterministic plan so the daily log has something to be measured against. A coach sheet on every screen proposes actions with reasons that name data and a trace; the coach never writes the database.

Reference feel (clarity, not branding): Success Life Coach Day Planner and habit trackers for the log; TaskCoach, Purpose, Rosebud, Mindsera, Habit Coach AI for the coach.

---

## Core loop

Open Today, log the next highlighted item, see it confirmed, repeat until the day's list is done.

Every loggable item is one tap or one number, under 5 seconds, and never leaves the screen. Each logged row shows a trace affordance.

---

## Screens (MVP has exactly five)

Navigation is these five plus a coach-sheet button on every screen. No command palette. No quick-add. No Guidance tab.

### 1. Onboarding

Sequence, and nothing else is reachable until it is done:

1. Goals (max 3).
2. Intake: fixed question list (wording stubbed below). Dimensions are the barrier and motivator codes already in `user_barriers` / `user_motivators`.
3. Deterministic plan generation.
4. Today.

Acceptance: a new user reaches Today with a non-empty plan in under 5 minutes. Intake produces a numeric score per dimension, stored with provenance.

### 2. Today

Chronological list of what to do and log today. Next item highlighted.

Item types:

- Habit: one tap.
- Metric: one number. Includes protein as a manual number (no meal log). Includes bodyweight and other tracked metrics from the plan.
- Session: link into Train (does not pack a full session editor on Today).

Acceptance: every item loggable in under 5 seconds without leaving the screen; each logged row shows a trace affordance.

A user with no training goal still uses Today for habits and metrics. The session item type is absent.

### 3. Progress

Per-goal streak, 7-day and 30-day completion rates, one trend line per tracked metric, quiz cards ("re-measure sleep": due date, last score, delta).

Acceptance: every number has a trace. Nothing here requires input except starting a quiz.

### 4. Train

Visible only if a training goal exists. Current program, next session, set logging (load × reps × RPE), per-lift trend.

Program is chosen from templates. Constraint gate runs last on anything the plan or a template proposes. Gate output carries a trace.

Default aim for the next set uses existing `prescribeNext` / `getAimFor` (10% load cap, hold on high or missing RPE, never load and reps in the same session).

Acceptance: a user with no training goal never sees this tab.

### 5. Settings

Goals, plan, constraints, coach tone, "How ERGOS works", shortcuts, sign out.

---

## Coach sheet (overlay, every screen)

Fixed button on every screen. One server route. One system prompt file ([coach-system-prompt.md](coach-system-prompt.md)) plus one tone variant file per tone ([coach-tones/](coach-tones/)).

Provider: Anthropic via `ANTHROPIC_API_KEY`. Model: `claude-sonnet-4-6`. This is the only LLM surface. Describe-a-meal is removed.

Context on every message: goals, plan, constraints, intake and quiz scores, last 14 days of logs, today's completion state.

Output contract: action, reason citing actual data, explanation file id, trace.

The coach never writes to the database. It proposes. The user confirms. The confirmed action is logged like any other input, with a trace pointing at the coach message that proposed it.

Proposals (plan edits, program changes) require explicit confirm.

The coach cites [explanations/](explanations/) for any health or behavior claim. It does not improvise mechanisms. It is not a clinician: it does not diagnose, does not give medical dosing, and defers to constraint rows without arguing with them.

Acceptance: "what should I do first today" returns an answer citing at least one logged row and one explanation file.

---

## Trace block

Collapsible monospace block under any recommendation or derived number. Spec in [ui-constitution.md](ui-constitution.md).

Lines: `rule_id@version`, then one line per input row (`table`, `id`, the field values read). Coach traces list explanation file ids and row ids.

The UI never recomputes a trace. It reads stored provenance: `rule_id`, rule version, and the ids of the rows read.

---

## Measurement quizzes

One per struggle dimension surfaced by intake. Fixed questions, numeric score, same scale as intake so deltas are comparable.

Cadence configurable, default 14 days. Score change updates habit states and coach tone by deterministic thresholds, all traced.

Tone is an enum: `direct`, `supportive`, `minimal`. Chosen by a quiz-score threshold, overridable in Settings. Tone is a system-prompt variant, not free-form personality.

### Tone thresholds (placeholders)

Replace the numbers before shipping. Unit-tested table in code; not a judgment call at runtime.

- `minimal` when the driving quiz/intake score is **≥ T_MINIMAL** (placeholder: 80).
- `direct` when the score is **< T_DIRECT** (placeholder: 40).
- `supportive` otherwise (placeholder band: 40 inclusive to 80 exclusive).

Driving dimension: placeholder **motivation_drop** (barrier code). Confirm or replace when filling intake wording.

---

## Plan generation (deterministic)

Input: goals + intake scores + constraint rows.

Output: habits with target frequency and initial four-state assignment (`build | hold | recover | dormant`), metrics to track, and a training program template if a training goal exists.

No LLM. Unit tested.

Constraint gate runs last. It may remove or modify. It never adds.

Existing session, set, habit, metric, and morning-entry rows are preserved across the rebuild. New plan generation writes new plan/habit/metric definition rows; it does not wipe logs.

---

## Constraints

User data, not code. A constraint row is:

- `label`
- excluded movement patterns
- load or range-of-motion limits
- a note

The gate reads rows. It never has owner-specific constraints compiled in. `seed/constraints.json` is not seeded to new users (see [tasks/01-onboarding-intake.md](tasks/01-onboarding-intake.md)). Owner medical rows live only in `seed/personal.sql` (gitignored). Fake examples: [../seed/example.sql](../seed/example.sql).

Obstructive sleep apnea is not a movement constraint. It is a recovery input: sleep quality gates training load and habit targets.

The gate exists so it can remove or modify anything the plan proposes, for reasons the engine cannot infer from rule ids. It runs last so nothing can re-add what it removed.

---

## How ERGOS works (tutorial page)

Reachable from Settings. Shown once on first run after onboarding.

1. What ERGOS is (3 sentences).
2. First run: goals, interview, plan.
3. Today: item types, how to log each, what the highlight means.
4. Progress: what each number means, how quizzes work.
5. Train: choosing a program, logging a session.
6. Coach: what it knows, what it can propose, nothing changes until you confirm, it is not a clinician.
7. Trace: how to read a trace block.
8. Editing goals, plan, and constraints.

---

## Intake

### Dimensions (from `20260821000000_user_intake.sql`)

Barriers: `time_scarcity`, `energy_crash`, `pain_flare`, `travel`, `motivation_drop`, `all_or_nothing`, `schedule_chaos`, `equipment_access`, `social_pressure`, `boredom`, `injury_fear`, `cost`.

Motivators: `mastery`, `autonomy`, `competition`, `appearance`, `health_longevity`, `social_connection`, `routine_comfort`, `novelty`, `proving_others_wrong`, `capability_restoration`.

Each dimension gets a numeric score on a shared scale (placeholder: 0–100) stored with provenance.

### Question wording (stubs)

Owner writes the real questions. Do not invent copy.

- Goals (max 3): stub — "Name up to three outcomes. Rank them."
- Where I am: stub — one item per relevant barrier/motivator asking current state. Wording TBD.
- Where I want to be: stub — same dimensions, target state. Wording TBD.
- What is holding me back: stub — select barriers from the enum; optional note. Wording TBD.

---

## Program templates

Templates are user data. The split is not a hardcoded rotation.

Shipped stubs (owner fills exercise lists):

- **Upper/Lower 4-day** — placeholder name `upper-lower-4`. Days: Upper A, Lower A, Upper B, Lower B. Exercise slots empty until filled in seed.
- **PPL 6-session** — legacy as-built rotation (Push A, Pull A, Legs A, Push B, Pull B, Legs B), offered as a template, not as the engine spine.

Equipment context is user data (commercial gym: barbells, dumbbells, cable stacks, selectorized machines, treadmills, bikes). Not compiled into application code.

---

## Architecture rules

- Multi-user from day one. Every table scoped by `user_id` under RLS. No personal facts in application code. Owner profile lives only in `seed/personal.sql`.
- Plan generation, habit state transitions, quiz scoring, and streaks are deterministic and unit tested. No LLM in any of them.
- Every recommendation and derived metric is stored with provenance: `rule_id`, rule version, and the ids of the rows it read.
- Coach tone is `direct | supportive | minimal`.
- Engine rule ids and their intent are listed in [AS-BUILT.md](AS-BUILT.md) section H. The engine code is a rebuild. Keep the ids' intent unless a task file says otherwise.

---

## LLM policy

- The coach sheet is the only LLM surface.
- Calls go through one server route with [coach-system-prompt.md](coach-system-prompt.md) plus one file in [coach-tones/](coach-tones/).
- Model: `claude-sonnet-4-6`. Key: `ANTHROPIC_API_KEY`.
- Coach never writes the database. Propose → confirm → log.
- Health or behavior claims cite `docs/explanations/*.md`. No improvised mechanisms.
- Not a clinician. No diagnosis, no medical dosing, no arguing with constraint rows.

---

## Copy and taste

No motivational copy, no praise, no emoji, no exclamation marks. Numbers in mono. Every recommendation names the data it read.

---

## Not in MVP (do not build, do not scaffold)

Food log, recipes, barcode scanning, describe-a-meal (tables may stay; no UI, no LLM call). Command palette, quick-add, session editor. Signal detection, evaluation harness. Free-form coach personality. Separate AI program designer. Multiplayer, social, sharing, marketplace. Light theme or theme switching. Native mobile apps (responsive web only). Wearable integrations. Payments. Grokbot (`docs/grokbot/` is unused history; do not implement).
