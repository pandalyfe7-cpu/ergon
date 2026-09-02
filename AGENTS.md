# Start here

ERGOS is a multi-user habit tracker. Training is one habit among them, not the center of the app.

Core loop: open Today, log the highlighted item (one tap or one number), see it confirmed, repeat until the day's list is done. First run is goals (max 3), then a fixed intake, then a deterministic plan; nothing else is reachable until that is done. The coach sheet is an overlay that proposes; the user confirms; confirmed actions are normal logs.

Binding docs: docs/PRODUCT-SPEC.md (to-be product), docs/ui-constitution.md (tokens + component specs; screens live in the spec), docs/AS-BUILT.md (frozen as-built truth; never mix it into the spec). Coach: docs/coach-system-prompt.md and docs/coach-tones/*.md. Claims: docs/explanations/*.md. Build order: docs/tasks/00-order.md.

Do not touch food/recipe/describe-a-meal UI or its LLM call, light theme, payments, wearables, native apps, social, a second LLM surface, or Grokbot. Do not copy current screens into the target spec.

Every table is scoped by user_id under RLS. Personal facts live only in seed/personal.sql (gitignored). Constraint gate runs last and reads constraint rows; it never has owner-specific rules compiled in. Plan generation, habit states, quizzes, and streaks are deterministic and unit-tested. Every recommendation and derived metric is stored with rule_id, rule version, and the row ids it read.

Engine rule ids and their intent are listed in docs/AS-BUILT.md. The engine code is a rebuild. Constitution tokens stay. Coach model is claude-sonnet-4-6 via ANTHROPIC_API_KEY.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
