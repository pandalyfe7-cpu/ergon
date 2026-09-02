# Telemetry

Emit events. Do not require a vendor. Names are stable; properties may grow but must not rename.

User identifiers in events are **hashes**, not emails or raw uuids, except inside the athlete’s own RLS world at query time.

## Event dictionary

### `chat.turn`

Fired once per `POST /v1/chat/turns` completion.

| Property | Type | Notes |
| --- | --- | --- |
| user_id_hash | string | |
| latency_ms | int | |
| tokens | int \| null | Null if templated |
| refuse | bool | |
| unknown_answer | bool | |
| tone_pack | string | |
| intent | string | Coordinator intent |
| env | `prod` \| `canary` | |
| onboarding_ready | bool | False if not-ready |

### `knowledge.ingest`

| Property | Type |
| --- | --- |
| source_host | string |
| accepted | bool |
| reason | string \| null |
| label | string \| null |
| clinical | bool |

### `release.canary`

| Property | Type |
| --- | --- |
| from_sha | string | Bundle+prompt pointer fingerprint |
| to_sha | string |
| abort_reason | string \| null |

### `release.rollback`

Same shape as canary. Always set `abort_reason` or `reason = operator`.

### `annoyance.card`

Aligns with ERGOS `RECOMMENDATION_STATUSES` in `src/lib/types/enums.ts`.

| Property | Type |
| --- | --- |
| user_id_hash | string |
| rec_id_hash | string |
| status | `shown` \| `accepted` \| `dismissed` \| `snoozed` \| `ignored` |
| env | `prod` \| `canary` |

`shown` maps to a card that was active and displayed. `ignored` maps to ERGOS `expired` without accept/dismiss (same as weekly rule feedback). Do not emit a card event for unknown / not-ready days.

**Annoyance (14 days):**

```
annoyance = (dismissed + snoozed + ignored) / shown
```

Unknown days excluded. Target: canary ≤ 0.8 × baseline (20% drop) and bootstrap 95% CI on the difference excluding 0, after `min_shown` (default 200). Else abort canary.

### `gate.invariant`

| Property | Type |
| --- | --- |
| fail_count | int | Must be 0 |
| test_id | string |
| env | string |

Any `fail_count > 0` pages the operator and blocks promote.

## Dashboard queries (logical)

Not Grafana JSON.

1. **Knowledge** — count docs by status; ingest reject reasons last 7d; spans whose `doc_id` is not in the current prod bundle (orphans).
2. **Chat** — p95 `latency_ms`, sum `tokens` per user_id_hash per day, `refuse` rate, `unknown_answer` rate.
3. **Safety** — sum `gate.invariant.fail_count` = 0; HITL queue age (from experiment/promote records); rollback count.
4. **Annoyance** — `annoyance.card` grouped by `env` and `status`; canary vs prod.

## Alerts

- `gate.invariant.fail_count > 0`
- Daily token sum over operator cap
- Canary annoyance worse than baseline after 200 shown cards
- Ingest reject spike (license_unknown) > 10/hour
