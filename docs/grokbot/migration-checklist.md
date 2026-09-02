# ERGOS migration checklist

Do this only when Grokbot leaves spec and enters the app. Order is mandatory. Do not replace `runEngine` or the gate.

## 0. Preconditions

- [ ] Intake tables exist (`user_profile`, `user_constraints`, `user_goals`, `user_barriers`, `user_motivators`) with RLS.
- [ ] Guidance still returns not-ready when profile is missing or `onboarding_step < 4`.
- [ ] No Grokbot tables in `src/` until step 1 ships as a **new** numbered file under `supabase/migrations/`. Never edit an applied migration.

## 1. Schema + RLS

- [ ] New migration: `knowledge_docs`, `knowledge_spans`, `knowledge_bundles`, `agent_runs`, `prompt_versions`, `policy_versions`, `release_pointers`, `experiments`, per-user `chat_turns`.
- [ ] RLS on every new table in the **same** migration.
- [ ] Per-user tables: `owner_all_access` for `authenticated`, `using (user_id = (select auth.uid()))` with check — match `supabase/migrations/20260821000000_user_intake.sql`.
- [ ] Shared `knowledge_docs` in `prod`: `SELECT` for `authenticated`; writes only via server role / service path, not the athlete JWT.
- [ ] `clinical` docs: not selectable by athletes until pointer + HITL column say so (safer: athletes never SELECT `staging` / `clinical` staging).

## 2. Routes

- [ ] Athlete-facing: **only** `POST /v1/chat/turns` as a Next.js route handler (App Router). No Coordinator URL.
- [ ] Operator routes (ingest, experiments, stress, promote, rollback): server-only, not in the public app shell.
- [ ] Auth: existing Supabase session for athletes. Operator: separate secret, not the user’s JWT.

## 3. Read existing ERGOS state (do not fork it)

- [ ] Chatbot/Coordinator read `user_profile.onboarding_step`, `user_motivators.code`, `user_barriers.code`.
- [ ] Same not-ready rule as [`src/lib/ergos/recommendations.ts`](../../src/lib/ergos/recommendations.ts): missing row or step `< 4` → no coaching.
- [ ] Explain-rec path **reads** persisted recommendations + `trace`; does not call `runEngine` to invent a new card.
- [ ] Why-blocked path reads constraint rows + gate reasons already stored on the session/rec.

## 4. Feature flag

- [ ] Flag off by default. On = Chatbot route exists. Off = 404, Guidance unchanged.
- [ ] Canary env pointer is independent of the flag (flag off ⇒ no athlete traffic).

## 5. HITL

- [ ] Queue for `clinical` ingest and any promote that includes `clinical` docs.
- [ ] Promote handler requires `hitl_ack_id` in that case (OpenAPI).
- [ ] Engine weight or `blocks_patterns` edits are **out of Grokbot**; checklist item is “reject and link to ERGOS maintainers.”

## 6. Telemetry bind

- [ ] Emit events from [telemetry.md](telemetry.md). Vendor choice is not part of this spec.
- [ ] `annoyance.card` uses existing rec statuses (`accepted`, `dismissed`, `snoozed`, expired → `ignored`).
- [ ] Alert: `gate.invariant` > 0.

## 7. Hard no

- [ ] Do not add a second scoring model.
- [ ] Do not let Chatbot write `logged_sets` or rotation position.
- [ ] Do not train vendors on transcripts ([privacy.md](privacy.md)).
- [ ] Do not skip Stress-Test on promote.
- [ ] Do not coerce unknown to 0 / false / a canned PPL explanation.

## 8. Verify before prod pointer flip

- [ ] Stress suite `all` green on the candidate bundle.
- [ ] F3 (not-ready) and F4 (jailbreak) still pass against the real route.
- [ ] Rollback drill: flip canary, rollback, stress on restored sha green.
- [ ] Annoyance pipeline computing 14-day ratio with unknown excluded.
