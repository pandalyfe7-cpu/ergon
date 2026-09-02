# Coordinator Agent

Front desk. Routes intent. Does not speak to the athlete.

## Customer

Personalized Chatbot (internal).

## Input

```json
{
  "turn_id": "uuid",
  "user_id": "opaque",
  "message": "string",
  "onboarding_step": null,
  "has_profile": false
}
```

`onboarding_step` is `null` when the profile row is missing (unknown, not 0).

## Output

```json
{
  "intent": "explain_rec | why_blocked | science_q | logistics | unsafe | not_ready",
  "budget": { "max_model_calls": 1, "max_spans": 8 },
  "engine_snapshot_ref": "opaque | null",
  "retrieval_query": "string | null",
  "trace": [{ "path": "coordinator.classify", "detail": "string", "rows": [] }]
}
```

## Rules

- If `has_profile` is false or `onboarding_step` is null or `< 4` → `not_ready`. Do not retrieve science. Do not call the engine for coaching.
- Prefer **deterministic rules** for classification (keyword + rec-id mention). A model classifier is allowed only if it is the turn’s single model call — then the Chatbot must not make a second call; it templates the reply.
- `unsafe`: injury advice beyond stored constraints, “ignore the gate,” supplement stacks, criminal/self-harm. Coordinator returns `unsafe`; Chatbot refuses in its voice and sets HITL.
- Never writes `knowledge_docs` or `release_pointers`.
- Not exposed as a public HTTP route.

## Permissions

Read: profile flags, current recs, env knowledge metadata. Write: `agent_runs` with `agent_id = coordinator`.
