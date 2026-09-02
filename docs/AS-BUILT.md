# ERGOS as-built

Frozen 2026-09-02. This document describes the repository as it existed at the memory-pack audit. Do not edit it to describe the target product. The to-be product lives in [PRODUCT-SPEC.md](PRODUCT-SPEC.md).

Repo name: **Ergon**. Product name in UI, constitution, and `src/lib/ergos/`: **ERGOS**. Schema tables are unprefixed.

Audit method: full read of app routes, `src/lib/engine`, `src/lib/ergos`, `supabase/migrations`, `seed/`, `docs/ui-constitution.md`, `e2e/`, README. KEEP requires a passing test unless noted. Vitest: 38/38 passed. Playwright: setup failed; 96 tests did not run. `npm run build` passed.

---

## A. Truths a new agent would miss

- **Next 16 uses `src/proxy.ts`, not `middleware.ts`.** Auth session refresh and the logged-out `/` rewrite live there. A new `middleware.ts` is ignored.
- **`ensureSeeded` runs on every authenticated layout render** (`src/app/(app)/layout.tsx`). The idempotent marker is a `rotation_state` row. First login copies the seeded library, constraint rules, metrics, habits, and 6-day PPL to that user.
- **Three constraint systems, not one.** (1) `constraint_rules` + exercise tags, enforced by `src/lib/engine/gate.ts`. (2) `exercises.constraints` jsonb (`SEATED`, `ROM_LIMIT`, `LOAD_CEILING`, `NO_AXIAL`, `NO_VALSALVA`) used by badges and `src/lib/training/aim.ts`, not by the gate. (3) `user_constraints` in `supabase/migrations/20260821000000_user_intake.sql` — schema only; the engine never reads it.
- **The gate is last inside `runEngine`.** Pipeline: candidates → guardrails → cold-start cap or top-4 → `applyGate` (`src/lib/engine/engine.ts`). Today also gates the lift list separately (`src/app/(app)/page.tsx`) before `prescribeNext`.
- **Rotation never skips.** The engine recommends only the session at `rotation.position`. If pattern-stacking drops that session, there is no session recommendation. Tested in `src/lib/engine/__tests__/engine.test.ts`.
- **Accepting a recommendation does not perform the action.** Accept / snooze / dismiss only change `recommendations.status`. Session start, habit mark, and metric log are separate writes.
- **Today and Guidance share one write-on-read.** Both call `refreshRecommendations`. Today shows `rows[0]`, the packed rotation session, and the morning entry. Guidance shows all rows, acted-on rows, and weekly rule feedback. Today ignores `output.notReady` and prints "Nothing pressing." Guidance shows "Not ready."
- **Onboarding is a backend gate with no UI.** `user_profile.onboarding_step < 4` or a missing profile expires today's recs and returns `notReady` (`src/lib/ergos/recommendations.ts`). Steps 1–4 are undefined in `src/`. E2E unlocks via SQL (`e2e/db.ts` `setOnboardingStep`).
- **Intake migration existed untracked at audit time** (`supabase/migrations/20260821000000_user_intake.sql`). If it is not applied, the `user_profile` select fails closed into the not-ready path. A missing profile is unknown, not step 0: the code does not insert a default row.
- **Provenance exists as labels, not row ids.** `TraceEntry.rows` is `string[]` (`habits protein-target`, `sessions 2026-08-18 Push A`, `bodyweight_logs latest`). Stored on `recommendations.trace` jsonb with `rule_ids` and `engine_version`. No per-entry rule version. No UUIDs.
- **Two documented rules are silent.** Header lists `time_honesty` and `no_pattern_stacking`. Those filters never push `ruleIds` or `trace`. Recovery and rest candidates start with empty trace until a guardrail fires.
- **6-session PPL is the seeded spine, not a user choice.** Six templates in `seed/exercises.json`; `rotation_state.position` is 0–5; finish advances `% 6`. Session estimate is hardcoded `SESSION_EST_MINUTES = 50` in `src/lib/ergos/data.ts`.
- **README is stale.** It lists `src/lib/coach`, a body tab, and a progress tab. Those libraries exist; there are no matching routes. Metrics is read-only (bodyweight log only via Cmd+J). Food is a full subtree under `/log-food`.
- **`docs/grokbot/` is unimplemented design IP.** Nothing in `src/` implements it. Leave it as unused history.
- **`src/lib/design/tokens.ts` does not exist.** Tokens live in `src/app/globals.css` `@theme`. Constitution §10 cited a missing file.
- **Personal medical text is in git** at `seed/constraints.json` (`left-leg-hardware`). `ensureSeeded` copies it to every new user.
- **Live backend from the audit machine was down.** Direct Postgres: `ENOTFOUND tenant/user postgres.vnpftpvfvtbrtettsemn`. `next start` logged repeating `AuthRetryableFetchError: fetch failed`. Public pages still painted. Authenticated loop was not proven. Owner will restore the paused free-tier project; assume tables and data survive.

Nav at audit: seven items in `src/components/nav.tsx` — Today, Guidance, Metrics, Habits, History, Food, Settings.

---

## B. Audit table

Verdicts: KEEP / KILL / REBUILD / UNVERIFIED. KEEP requires a passing test except constitution tokens (explicit override) and the RLS/table pattern as schema-to-preserve.

- **Naming Ergon vs ERGOS** — KEEP (split). Cite: `package.json` name `ergon`; UI title ERGOS in `src/app/layout.tsx`; module `src/lib/ergos/`.
- **Auth / RLS / env / user_id** — KEEP schema pattern; UNVERIFIED at runtime. Every public table has `user_id` (PK on `user_profile`) and policy `owner_all_access` (`using` + `with check` on `auth.uid()`). Application queries do not `.eq("user_id")`. Playwright setup failed; server auth fetch failed at audit. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; LLM `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`; e2e `SUPABASE_DB_URL` / `SUPABASE_DB_POOLER_URL` (not in `.env.example`).
- **Recommendation engine** — REBUILD code; KEEP rule-id intent as a list (section H). Vitest 38/38 proved as-built scoring. Product contract changes (habit-first log, split as user data, provenance as UUIDs + rule version, constraint rows not seeded predicates).
- **Constraint gate last** — KEEP as an invariant (tested: `engine.test.ts` contraindicated-movements suite; `applyGate` is the last step). REBUILD implementation: gate must read user constraint rows; `is_fixture` exclusion is hardcoded in `gate.ts`.
- **Rotation 6-session PPL / prescription** — KILL PPL as the engine spine; it is one seeded template. KEEP `prescribeNext` / `getAimFor` as Train default aim (passing tests in `prescription.test.ts`: 10% cap, no load+reps same session, hold on high/missing RPE).
- **Habits four-state** — KEEP data model (`build | hold | recover | dormant` in `src/lib/types/enums.ts`). REBUILD transitions and UI. Only proven test: dormant habits are never recommended. Lazy transitions in `src/lib/ergos/data.ts` (dormant after 14 days; recover after decay window) have no dedicated unit file.
- **Food / recipes / describe-a-meal** — KILL UI and LLM. Tables may remain unused. Sole LLM at audit: `src/lib/food/estimate.ts` lines 63–87.
- **Metrics / morning entry / body** — REBUILD. Metrics page is read-only. Morning entry is a Today-only write. `src/lib/body/` has no route.
- **History / session editor** — KILL UI (`/history`, `/history/[id]`, `src/components/history/session-editor.tsx`). Session and set rows stay.
- **Settings / palette / quick-add** — KILL palette (`src/components/palette.tsx`) and quick-add (`src/components/quick-add.tsx`). REBUILD Settings.
- **Information architecture** — KILL seven-tab IA and Today-as-dashboard (session packed beside one rec). Guidance is a second rec surface for the same engine output.
- **UI constitution** — KEEP v2 tokens (hex, type, radius, motion, copy bans). Document rewritten separately to v3. Constitution v2 never defined screens or "done". Implementation drift at audit: `text-[11px]`, metrics hero 24px not 32, stagger on every navigation, unused `motion` package, missing `tokens.ts`.
- **Tests** — Vitest covers only `src/lib/engine/__tests__/*.test.ts`. Playwright 97 tests did not run past `e2e/auth.setup.ts`. No UI subsystem is KEEP.

### Today vs Guidance overlap

Same `refreshRecommendations` write. Today = primary rec + packed 6-day session + morning card + link "N more on Guidance". Guidance = full ranked list + acted-on + rule feedback when `totalShown >= 10`. Neither is a chronological log of what to do today.

### Constitution vs implementation gaps

- §8: Settings does not document Cmd+K / Cmd+J.
- §5 command palette exists; the "Do" group is unused.
- §7 stagger is "first load only"; `.enter-rise` runs on every navigation.
- §3 type scale: `text-[11px]` in food components; metrics hero is `text-2xl` (24px).
- §10: tokens are in `globals.css`, not `src/lib/design/tokens.ts`.
- Identity §1 trace: RecCard "Why" expands `rule_ids` + `trace.detail` / `trace.rows` strings. Not UUID provenance.

### LLM call sites at audit

1. `src/lib/food/estimate.ts:67` — `process.env.ANTHROPIC_API_KEY`; `:80` — `process.env.ANTHROPIC_MODEL` or default `claude-haiku-4-5`; `fetch("https://api.anthropic.com/v1/messages")`.
2. `src/lib/food/actions.ts:155` — server action `estimateMealFromText` calls (1).
3. `src/components/food/describe-meal.tsx` — client calls (2).

No other LLM. No `src/app/api/**`. Engine, gate, coach-decision writes, and training prescription are deterministic.

---

## H. Engine rule inventory

`ENGINE_VERSION = "1.0.0"` in `src/lib/engine/engine.ts`. Weights defaults in `src/lib/engine/weights.ts`: staleness 1.0, gap 1.0, decay_risk 1.3, fit 0.3, recovery 2.0, rest_pressure 1.5, threshold 0.5. Stored in `engine_weights`; the engine never self-tunes.

### Scoring / guardrail ids

- **staleness** — next rotation session. Inputs: `rotation.position`, session `lastPerformedDate`, `today`, `weights.staleness`. Score: `w.staleness * min(staleDays/3, 2)` or `w.staleness` if never run. Trace rows: `sessions {date} {name}` or `exercise_templates rotation_index {n}`.
- **gap** (session) — metric slug `training-days` below floor. Inputs: `current`, `floor`, `ceiling`, `weights.gap`. Score bump: `+ w.gap * 0.5`. Trace: `metric_definitions training-days`. Other metrics below band do not generate recommendations.
- **gap** (metric candidate) — bodyweight stale ≥3 days. Inputs: `bodyweightLastLoggedDate`, `today`, `historyDays`, `weights.gap`. Score: `w.gap * 0.8`. Trace: `bodyweight_logs latest`.
- **decay_risk** — habit urgency. Inputs: `lastCompletedDate`, `decayWindowDays`, `today`, `historyDays`, `weights.decay_risk`. Score: `w.decay_risk * min(daysSince/window, 2)`. Skips `dormant` and `markedToday`. Trace: `habits {slug}`, optional `habit_events {date}`.
- **smallest_next_step** — fires when urgency ≥ 1. Inputs: same plus `floorAction`. No extra score; title becomes the floor action. Trace: `habits {slug}`.
- **fit** — `estMinutes <= timeAvailableMin * 0.8` and `> 0`. Score: `+ w.fit * 0.2`. Trace: `morning_entries time_available`.
- **recovery_first** — `morning.sleepHours < 6` OR `sleepQuality <= 3`. Sessions: `score *= 0.25`. Recovery: boosted above training. Trace: `morning_entries {today}`. Thresholds are code, not user rows.
- **rest_pressure** — 3 consecutive dates in `trainedDates` ending yesterday. Rest/recovery boosted. Trace: `sessions {date}` strings.
- **cold_start** — `historyDays < 14`. Caps output to next session + highest-scoring habit. Trace `rows: []`. Full scoring at 14 days (tested).
- **gate** — last filter on session candidates. Inputs: candidate exercises, `constraint_rules`, exercise library. Drops the whole session if `allowed` is empty. Trace: `exercises {slug}` per exclusion or substitution.
- **time_honesty** — documented; silently drops candidates with `estMinutes > timeAvailableMin`. No rule id, no trace.
- **no_pattern_stacking** — documented; silently drops a session if any exercise pattern is in yesterday's `patternsByDate`. No rule id, no trace.

Seeded gate rule ids (`seed/constraints.json` → `constraint_rules`): `no-standing-axial`, `overhead-seated`, `knee-rom-30-90`, `no-valsalva`, `left-leg-hardware`.

Hardcoded gate behavior: `is_fixture === true` always excluded before predicates; substitution via `substitution_slug` if the substitute also passes.

### Prescription ids (not recommendation rows)

From `src/lib/training/aim.ts` and `src/lib/engine/prescription.ts`: `hold_no_rpe`, `hold_rest`, `add_load`, `add_reps`, `hold`, `hold_ceiling`, `load_cap`. Written to `coach_decisions.rule`. Nothing in the app reads `coach_decisions` after write.

### Provenance verdict

Present on `recommendations.rule_ids` and `recommendations.trace` as human-readable strings plus `engine_version` and `seed_versions`. Not row UUIDs. Not per-rule version. `time_honesty` and `no_pattern_stacking` leave no provenance. Target trace cannot read this as-is; UUID provenance must be added.

---

## I. Multi-user readiness

### Tables and RLS

Every public table in the five migrations has `user_id` (or `user_id` as PK on `user_profile`) and RLS enabled with policy `owner_all_access` for `authenticated`: `using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))`.

Foundation (`20260728000000_foundation.sql`): `exercises`, `exercise_templates`, `sessions`, `logged_sets`, `foods`, `logged_meals`, `daily_macro_targets`, `recipes`, `water_logs`, `bodyweight_logs`, `user_settings`.

Coach (`20260728010000_coach_decisions.sql`): `coach_decisions`.

ERGOS (`20260819000000_ergos.sql` + `20260819001000_habit_config.sql`): `rotation_state`, `constraint_rules`, `habits`, `habit_events`, `metric_definitions`, `morning_entries`, `recommendations`, `engine_weights`. `habits.config` added later; RLS inherited.

Intake (`20260821000000_user_intake.sql`): `user_profile`, `user_constraints`, `user_goals`, `user_barriers`, `user_motivators`.

No unscoped public table and no table missing RLS in those files. E2e (`e2e/db.ts`) connects with `SUPABASE_DB_URL` / `SUPABASE_DB_POOLER_URL` and bypasses RLS. Application code relies on the session JWT.

Unit-in-name columns: `weight_lb`, `protein_g`, `carbs_g`, `fat_g`, `amount_ml`, `daily_water_target_ml`, `water_increment_ml`, `default_time_available_min`, `time_available_min`, `height_cm`, `weight_kg`, `est_minutes`. Convention stated in `foundation.sql` lines 7–8.

### Personal facts in application code

- `src/lib/types/constraints.ts:59-63` — `DEFAULT_ROM_LIMIT = { min_degrees: 30, max_degrees: 90 }`.
- `src/lib/engine/engine.ts:279-281` — sleep `< 6` or quality `<= 3`.
- `src/lib/ergos/data.ts:49` — `SESSION_EST_MINUTES = 50`.
- `src/lib/ergos/data.ts:123` — habit dormant after 14 days without events.
- `src/lib/types/constraints.ts:71` — comment example `CAP 135 LB` (not stored).
- No name, no YMCA, no TBI, no cranioplasty strings in `src/`.

### Personal facts in tracked seed (copied to every user by `ensureSeeded`)

- `seed/constraints.json:42` — "Left femur and left tibia carry intramedullary rods; left patellar osteoarthritis. No impact loading." (`left-leg-hardware`).
- `seed/constraints.json` — `no-standing-axial`, `overhead-seated`, `knee-rom-30-90`, `no-valsalva`.
- `seed/metrics.json:10` — bodyweight 155–165 lb.
- `seed/metrics.json:28-31` — protein 1.0 g/lb, fallback 160–190 g.
- `seed/metrics.json:42` — training days 4–6.
- `seed/metrics.json:18` — sleep 7–9 h.
- `seed/habits.json:41` — `target_bed_time: "23:00"`.
- `seed/habits.json:65-77` — study-blocks habit.
- `seed/exercises.json` — constrained library and Push A / Pull A / Legs A / Push B / Pull B / Legs B.

Generalizable at audit: schema and RLS yes; seed no. Every new user receives the owner's medical constraint table and metric bands.

---

## G. Build and test health (raw, 2026-09-02)

### Vitest (`npm test`) — pass

```
> ergon@0.1.0 test
> vitest run

 RUN  v4.1.11 C:/Users/Owner/ergon app

 Test Files  3 passed (3)
      Tests  38 passed (38)
   Start at  11:14:53
   Duration  216ms (transform 123ms, setup 0ms, import 169ms, tests 20ms, environment 0ms)
```

Files: `src/lib/engine/__tests__/gate.test.ts`, `prescription.test.ts`, `engine.test.ts`.

### Playwright (`npm run test:e2e`) — fail at setup

```
> ergon@0.1.0 test:e2e
> playwright test

Running 97 tests using 1 worker

  x   1 [setup] › e2e\auth.setup.ts:12:6 › provision, seed, and sign in the E2E user (2.8s)

    error: (ENOTFOUND) tenant/user postgres.vnpftpvfvtbrtettsemn not found

  1 failed
    [setup] › e2e\auth.setup.ts:12:6 › provision, seed, and sign in the E2E user
  96 did not run
```

### `npm run build` — pass

```
> ergon@0.1.0 build
> next build

▲ Next.js 16.2.12 (Turbopack)
- Environments: .env.local
- Experiments (use with caution):
  ✓ viewTransition

✓ Compiled successfully in 2.3s
  Running TypeScript ...
  Finished TypeScript in 3.1s ...
  Generating static pages using 15 workers (18/18) in 206ms

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /auth/callback
├ ƒ /guidance
├ ƒ /habits
├ ƒ /history
├ ƒ /history/[id]
├ ƒ /log-food
├ ƒ /log-food/describe
├ ƒ /log-food/new
├ ƒ /log-food/recipes
├ ƒ /log-food/recipes/[id]
├ ƒ /log-food/recipes/new
├ ƒ /metrics
├ ƒ /settings
├ ƒ /sign-in
├ ○ /sign-up
└ ○ /welcome

ƒ Proxy (Middleware)
```

### Route render at audit (logged out, `npx next start -p 3211`)

`/welcome`, `/sign-in`, `/sign-up` painted. Logged-out `/` rewrote to welcome content (URL stayed `/`). `/guidance` redirected to `/sign-in`. No Next error overlay on those public pages. Authenticated screens not verified. Server log while browsing:

```
Error [AuthRetryableFetchError]: fetch failed
  __isAuthError: true
  status: 0
```
