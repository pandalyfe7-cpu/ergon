# Task 03 — Progress: streaks, trends, measurement quizzes

## Work

- Progress screen: per-goal streak, 7-day and 30-day completion, one trend line per tracked metric, quiz cards.
- Quizzes: one per struggle dimension from intake; fixed questions; numeric score on the same scale as intake; default cadence 14 days.
- Score change updates habit states and coach tone via the placeholder threshold table in [PRODUCT-SPEC.md](../PRODUCT-SPEC.md). Deterministic, unit tested, traced.
- Every number on the screen has a stored trace.
- Nothing here requires input except starting a quiz.

## Done when

- Unit tests: streak and 7/30-day completion from a fixture of logs; quiz score delta; tone enum from the threshold table (placeholders allowed).
- Unit test: habit state transition from a quiz score change is deterministic and writes provenance.
- E2e: Progress shows a streak and a trend for a metric that was logged on Today; starting a due quiz records a new score; every visible number has a trace affordance.
- A user with no input required except the quiz can use the screen without leaving it.

## Not this task

Coach LLM, Train, food.
