# Privacy

Privacy-first is a constraint, not a later patch. Grokbot treats athlete data as **not a training corpus**.

## Data classes

| Class | Examples | Store | Shared knowledge? |
| --- | --- | --- | --- |
| Public science | Allowlisted papers, position stands | `knowledge_docs` | Yes, after staging + tests |
| Profile | `onboarding_step`, motivators, barriers, constraints | ERGOS user tables | Never |
| Transcripts | Chat turns | Per-user chat store | Never |
| Telemetry | Hashed user id, latencies, refuse flags | Event log | Aggregates only |
| Secrets | Operator tokens, HITL acks | Secret manager | Never in docs or chat |

## Isolation

- One athlete’s turns are not visible to another athlete.
- Knowledge spans contain **no** user identifiers.
- Retrieval is by env pointer (`prod` / `canary`), not “everything the librarian ever fetched.”
- Operator APIs (ingest, promote, rollback) use a separate principal from the athlete Bearer token.

When this spec is bound to ERGOS, chat rows use the same RLS shape as other owner tables: `user_id = (select auth.uid())`. Shared `knowledge_docs` in `prod` are readable by authenticated users; writes stay on the server.

## Retention

| Store | Retention |
| --- | --- |
| Chat turns | 90 days rolling, or athlete delete |
| `agent_runs` | 90 days (needed for Why / incident replay) |
| Knowledge raw bytes | Life of the doc version; rolled_back versions kept for audit |
| Telemetry | 13 months for annoyance windows; user_id hashed at write |
| HITL tickets | Until closed + 13 months |

Delete of an athlete account deletes transcripts and their `agent_runs`. It does not delete public science docs.

## No-training

- Vendor contracts for any future model call: **no** opt-in to train on athlete content.
- Do not paste API keys or medical record PDFs into chat. Operator ingest is allowlist URLs (and a later optional user-PDF path that stays in the athlete’s tenant).
- Embeddings of knowledge docs are of public science, not of transcripts.

## Unknown and not-ready

- Missing `user_profile` is unknown, not step 0 stored, and not a default insert.
- Chat and Guidance both refuse to coach until `onboarding_step >= 4`.
- Sleep / bedtime / rec “shown” counts treat null as unknown: excluded from annoyance math.

## Minimization

Chatbot context includes: last N turns, a short rolling summary, current rec + engine trace, at most 8 spans, motivator/barrier **codes** (not free-text life stories unless the athlete typed them this turn).

Do not send the full constraint `rom_notes` to a model unless the intent is `why_blocked` and the note is already on the athlete’s own row.
