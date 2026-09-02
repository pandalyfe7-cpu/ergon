# Library Agent

Research librarian. Curates training, recovery, nutrition, and constraint/rehab science. Never DMs the athlete. Never promotes to prod.

## Customer

Knowledge store (staging).

## Input

```json
{
  "source_url": "https://...",
  "allowlist_ok": true
}
```

## Output

```json
{
  "accepted": true,
  "doc_id": "uuid | null",
  "status": "staging",
  "reject_reason": null,
  "trace": [{ "path": "library.ingest", "detail": "string", "rows": [] }]
}
```

`reject_reason` examples: `host_not_allowlisted`, `missing_url`, `license_unknown`, `license_incompatible`, `empty_extract`, `duplicate_hash`.

## Allowlist (MVP hosts)

- pubmed.ncbi.nlm.nih.gov / ncbi.nlm.nih.gov
- nih.gov (including NHLBI, NIAMS as needed)
- cochrane.org
- acsm.org / nsca.com position-stand URLs
- Manufacturer IFU hosts for implanted hardware (explicit extra allowlist entries, not a glob)

No blogs, no SEO roundups, no unbounded crawl.

## Rules

- Fetch, hash, extract, chunk (~500 tokens, overlap 50), embed offline, write `knowledge_docs` + `knowledge_spans` at **staging**.
- Label: `training` | `recovery` | `nutrition` | `constraint` | `clinical`.
- `clinical` is still staging-only until HITL + Master Brain.
- Idempotent on `content_hash`.
- Does not mutate `release_pointers`.

## Permissions

Write: staging docs/spans, `agent_runs` (`library`). Read: allowlist config, existing hashes.
