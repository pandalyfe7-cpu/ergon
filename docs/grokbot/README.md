# Grokbot

Design spec only. This directory is the Grokbot IP for the current quarter: contracts, schemas, and rollback rules. Nothing here is implemented in `src/`. The ERGOS recommendation engine and constraint gate stay the source of truth for *what* to do.

**Audience.** Future implementers porting this into ERGOS (Next.js, Supabase, RLS). The wording is stack-agnostic until [migration-checklist.md](migration-checklist.md).

## Locked decisions

- Only the **Personalized Chatbot** produces athlete-visible text. Other agents are back office.
- Status such as “still looking up the paper” is spoken *by* the Chatbot, not a second personality.
- Grokbot may change **tone and explainer copy**. It may not choose loads, substitutions, or `blocks_patterns`.
- A recommendation still cannot be shown without storing the inputs that produced it.
- Missing profile or `onboarding_step < 4` is **not-ready**, not a default-filled coach.
- Unknown stays unknown. Never coerce to 0, false, or an invented protocol.
- Annoyance target: **20%** drop in `(dismissed + snoozed + ignored) / shown` over 14 days versus baseline. Unknown / unshown days are excluded from both numerator and denominator.

## Documents

| File | Purpose |
| --- | --- |
| [architecture.md](architecture.md) | Diagram, permission matrix, data flow |
| [privacy.md](privacy.md) | Data classes, retention, no-training, isolation |
| [knowledge-store.md](knowledge-store.md) | Versioned store, provenance, status machine |
| [agents/](agents/) | Six agent I/O contracts |
| [api/openapi.yaml](api/openapi.yaml) | HTTP contracts |
| [telemetry.md](telemetry.md) | Events, properties, dashboard queries |
| [prototype.md](prototype.md) | Mock endpoints, fixtures, canary walkthrough |
| [migration-checklist.md](migration-checklist.md) | Ordered ERGOS port |

## Glossary

- **Athlete.** The signed-in ERGOS user.
- **Env pointer.** The `prod` or `canary` row in `release_pointers` that names which knowledge bundle and prompt version are live.
- **Provenance tuple.** `(source_url, retrieved_at, content_hash, license, quote)` required on every science claim.
- **Tone pack.** Enum selected from `user_motivators` / `user_barriers`; wording only.
- **HITL.** Human-in-the-loop ack required before `clinical` or engine-adjacent artifacts leave `staging`.
- **Trace.** Same idea as ERGOS Guidance “Why”: path, detail, rows read.

## Non-goals

- Implementing agents or adding npm packages this quarter.
- Replacing `runEngine` or the constraint gate.
- Configuring Cursor’s Grok Bot product.
- Onboarding wizard UI.
- A second scoring / CTR model.
- A seventh agent.

## Spec sprint

- Month 1: this index, architecture, privacy, knowledge store.
- Month 2: agent specs, OpenAPI, telemetry.
- Month 3: prototype mocks, canary/rollback, migration checklist. Freeze.
