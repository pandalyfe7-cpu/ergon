# Master Brain

Release owner. Not a genius model. Keys to canary, prod, and rollback.

## Customer

Production pointers. Human operator for HITL.

## State machine

```
staging artifact
    → Stress-Test pass
    → (HITL if clinical or engine-adjacent)
    → canary (~10% of chat turns)
    → prod
    → rollback to previous pointer pair
```

Abort canary if any of:

- `gate.invariant` count > 0
- Annoyance on canary is worse than baseline after `min_shown` (stop rules)
- Daily token spend exceeds the stated cap (operator config; spec does not name a vendor)

## Input

Promote or rollback request plus optional HITL token.

## Output

```json
{
  "env": "canary | prod",
  "from": { "knowledge_bundle_id": "uuid", "prompt_version_id": "uuid" },
  "to": { "knowledge_bundle_id": "uuid", "prompt_version_id": "uuid" },
  "aborted": false,
  "abort_reason": null
}
```

Rollback writes **both** knowledge and prompt pointers in one transaction, then requests a Stress-Test rerun on the restored shas.

## HITL

Required before leaving staging when:

- Any doc in the bundle is `clinical`
- Experiment touches engine weights or constraint vocabulary (those changes are not Grokbot’s to make; the ticket is “refuse and send to ERGOS maintainers”)

HITL is an explicit ack id on the promote call, not a model saying “looks good.”

## Athlete visibility

Master Brain does not send messages. If a rollback happens mid-session, the **Chatbot** may say the previous explainer is back — in the coach voice.

## Permissions

Write: `release_pointers`, `agent_runs` (`master_brain`). Read: stress reports, experiments, HITL queue.
