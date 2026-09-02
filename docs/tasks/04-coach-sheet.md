# Task 04 — Coach sheet

## Work

- Fixed button on every screen opens a chat overlay (constitution: Coach sheet).
- One server route. System prompt: [coach-system-prompt.md](../coach-system-prompt.md). Tone file: one of [coach-tones/direct.md](../coach-tones/direct.md), [supportive.md](../coach-tones/supportive.md), [minimal.md](../coach-tones/minimal.md) chosen by Settings override or the threshold table.
- Provider: Anthropic `ANTHROPIC_API_KEY`. Model: `claude-sonnet-4-6`.
- Context per message: goals, plan, constraints, intake and quiz scores, last 14 days of logs, today's completion state.
- Coach never writes the database. Proposals require confirm. Confirmed action is a normal log with trace pointing at the coach message.
- Describe-a-meal and any other LLM path remain absent.

## Done when

- A test of the route (mocked model) asserts the system prompt file and the selected tone file are both sent, and the model is `claude-sonnet-4-6`.
- A test asserts a coach proposal does not insert habit/metric/session rows until confirm, and after confirm the log row's trace references the coach message id.
- E2e (or request-level): "what should I do first today" returns an answer that cites at least one logged row id and one explanation file id, with a trace block.

## Not this task

A second LLM surface, AI program designer, food estimate.
