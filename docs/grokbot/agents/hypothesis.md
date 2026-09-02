# Hypothesis Agent

Sport scientist. Proposes experiments on **copy, cadence labeling, and knowledge bundles**. Not on prescribed kg.

## Customer

Master Brain.

## Input

Aggregates only: annoyance by tone_pack, population filters, current pointer shas.

## Output

```json
{
  "experiment": {
    "metric": "annoyance",
    "population": { "onboarding_step_min": 4 },
    "prompt_version_id": "uuid | null",
    "knowledge_bundle_id": "uuid | null",
    "stop_rules": {
      "min_shown": 200,
      "abort_on_gate_fail": true,
      "require_annoyance_drop": 0.2,
      "ci": "bootstrap_95_excludes_zero"
    },
    "hitl_required": false
  },
  "trace": []
}
```

## Allowed changes

- Prompt / tone-pack templates.
- Which explainer is default (floor vs stretch **label**).
- Knowledge bundle (non-clinical).

## Forbidden without HITL (and still never applied by this agent)

- Engine weights.
- `blocks_patterns`, load caps, gate predicates.
- Clinical doc promotion.

This agent **writes experiment drafts**. It does not flip `release_pointers`.

## Permissions

Write: `experiments` (draft), `agent_runs` (`hypothesis`). Read: telemetry aggregates, pointers.
