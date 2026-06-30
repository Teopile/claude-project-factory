# Project Factory — Self-Eval

A golden set of small, representative build tasks used to measure the harness and
catch regressions. Each task is built fresh and run through the **same independent
objective gate** the real factory uses (real build/test exit codes, artifact
existence, reward-hack scan) — so the score reflects objective correctness, not
self-report.

## Run
Invoke the eval engine `eval/run-eval.workflow.js` (via the Workflow tool) with
absolute-path args:

```json
{ "evalDir": "<abs ~/.claude/project-factory/eval>",
  "workDir": "<abs ~/Projects/_factory-eval>",
  "effort": "high",
  "threshold": 1.0 }
```

It builds each task in its own directory, gates it, and returns a scorecard:
`{ total, passed, rate, regression, results }`.

## Regression gate
`regression: true` when the pass-rate drops below `threshold` (default `1.0` —
every golden task must pass). Run this after changing any agent, the engine, or
the templates; a regression should block the change.

## Grow the set
Every time a real build ships a bug the gate missed, add a golden task that
reproduces it. The set is the harness's memory of what "correct" means; it should
only ever grow. Edit `golden-tasks.json`.
