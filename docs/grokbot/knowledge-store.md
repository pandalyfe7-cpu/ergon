# Knowledge store

Versioned, provenance-first. A document without a durable URL, fetch time, content hash, and license does not enter the store.

## Provenance tuple

Required on every science claim the Chatbot surfaces:

`(source_url, retrieved_at, content_hash, license, quote)`

- `source_url` — HTTPS URL that still resolves at `retrieved_at` (allowlist host).
- `retrieved_at` — timestamptz of the fetch, not ingest time if they differ.
- `content_hash` — SHA-256 of raw bytes.
- `license` — SPDX id or `all-rights-reserved` / `unknown`. `unknown` → **reject ingest**.
- `quote` — exact span text with `quote_start` / `quote_end` offsets into the extracted document.

Incompatible license (no quotation right, or share-alike that would contaminate the app) → reject. Missing URL → reject. Duplicate `content_hash` → idempotent skip.

## Status machine

```
staging → canary → prod
    │         │
    └── rolled_back ←── (from canary or prod)
```

- **staging** — Library Agent write target. Not retrievable by athlete chat.
- **canary** — Master Brain pointer for ~10% of turns. Stress-Test must pass first.
- **prod** — default pointer.
- **rolled_back** — previous prod bundle after a rollback. Kept for audit; not served.

`clinical` label never auto-promotes. HITL ack required before leaving `staging`.

## Logical schema (vendor-neutral)

SQL-flavored types. Bind to Postgres in [migration-checklist.md](migration-checklist.md).

### knowledge_docs

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| version | int | Monotonic per `source_url` or per logical work |
| content_hash | text | SHA-256 hex |
| source_url | text | Not null |
| license | text | Not null; reject `unknown` at ingest |
| retrieved_at | timestamptz | Not null |
| ingested_by | text | Agent id `library` + run id |
| label | text | `training` \| `recovery` \| `nutrition` \| `constraint` \| `clinical` |
| status | text | `staging` \| `canary` \| `prod` \| `rolled_back` |
| title | text | Optional display |
| created_at | timestamptz | |

Unique `(content_hash)`. Index `(status, label)`.

### knowledge_spans

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| doc_id | uuid | FK docs |
| doc_version | int | Must match parent version |
| ordinal | int | Chunk order |
| text | text | Chunk body |
| quote_start | int | Offset in extracted full text |
| quote_end | int | Exclusive |
| embedding_ref | text | Opaque id in the embedding index; not a vendor name |

### knowledge_bundles

A named set of `knowledge_docs` versions served together.

| Column | Type |
| --- | --- |
| id | uuid |
| docs | list of `{doc_id, version}` |
| created_at | timestamptz |

### agent_runs

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | |
| agent_id | text | `chatbot` \| `coordinator` \| `library` \| `hypothesis` \| `stress_test` \| `master_brain` |
| input_hash | text | Hash of canonical JSON input |
| output | jsonb | Agent-specific; no secrets |
| trace | jsonb | Array of `{path, detail, rows[]}` |
| tokens | int \| null | Null if no model call |
| created_at | timestamptz | |

### prompt_versions / policy_versions

| Column | Type |
| --- | --- |
| id | uuid |
| sha | text | Git or content sha of the prompt/policy artifact |
| artifact_uri | text | Opaque pointer (object storage key, not a vendor) |
| created_at | timestamptz |

### release_pointers

| Column | Type | Notes |
| --- | --- | --- |
| env | text | PK-ish: `prod` \| `canary` |
| knowledge_bundle_id | uuid | |
| prompt_version_id | uuid | |
| updated_at | timestamptz | App-written |

Rollback = one transaction writing **both** `prod` (or `canary`) columns to the previous pointer pair.

### experiments (Hypothesis)

| Column | Type |
| --- | --- |
| id | uuid |
| metric | text | Must be `annoyance` for MVP |
| population | jsonb | e.g. `{onboarding_step_min: 4}` |
| knowledge_bundle_id | uuid \| null |
| prompt_version_id | uuid \| null |
| stop_rules | jsonb | Shown-card N, gate-fail abort, CI |
| status | text | `draft` \| `running` \| `aborted` \| `completed` |
| hitl_required | boolean | True if clinical / engine-adjacent |

## Ingest pipeline (Library)

1. Host must be on the allowlist (PubMed, NIH, ACSM/NSCA position stands, Cochrane, manufacturer IFUs). No open-web crawl.
2. Fetch → store raw bytes + hash.
3. If hash exists, stop (idempotent).
4. Extract text. Chunk ~500 tokens, overlap 50.
5. Embed offline; write spans with `embedding_ref`.
6. Label `training` \| `recovery` \| `nutrition` \| `constraint` \| `clinical`.
7. Insert `knowledge_docs.status = staging` only.

Promote is Master Brain + Stress-Test, not the librarian.

## Retrieval rules (Chatbot)

- Query only spans whose parent doc is in the **current env bundle**.
- k ≤ 8.
- Every cited span must still exist; orphan citation is a stress-test failure.
- No span → Chatbot answers unknown, does not invent a protocol.
