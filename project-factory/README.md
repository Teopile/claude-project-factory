# Project Factory — Autonomous Build Harness

Takes a short idea and drives it to a completed, **objectively verified** project
with minimal human intervention. You give an idea → the Spec Architect writes
exhaustive docs + a bespoke design + asks you everything once → an autonomous
loop builds, verifies, and documents each unit until the whole project is done.

## Models & config (`config.json`)
- Builder/reasoner = Claude **Fable 5**. Optional co-builder = **Codex `gpt-5.5`**
  (`useCodex`, offered on first run). Cheap roles (verifier, planning) may use a
  lighter tier.
- `usage` = `lean | balanced | thorough | unlimited` — scales fix-iterations,
  parallelism, research and verification depth. `unlimited` = go all-out, ignore
  budget.
- `effort` = `low | medium | high | xhigh | max` — reasoning effort passed to
  every agent call.
- `guardrails` = `standard` (deploy/destructive actions pause for one confirm) or
  `full` (never pause).
- `reviewGates` = `none` (full auto), `spec` (pause after the plan for your
  approval before building), or `milestones` (also pause after the first verified
  slice, via `MILESTONE.md` — approve to resume). `none` by default.

Projects live in `~/Projects/<name>/`. Stack is chosen per-project by the Architect.

## Agents
**manager** (overseer + intake/Spec Architect), **builder** (Claude + Codex, in an
isolated git worktree), **reviewer** (adversarial two-pass + reward-hack scan),
**qa** (manual + automated, runs for real), **verifier** (INDEPENDENT objective
gate), **doc** (keeps docs true, merges, commits). Every agent runs at the chosen
effort and may spawn its own subagents/skills.

## Document set (per project, `~/Projects/<name>/docs/`)
`master-spec.md`, `design-direction.md` (bespoke brand book), `constitution.md`
(immutable rules), `work-breakdown.md` (dependency-ordered units), `state.json`,
`decision-log.md`, `lessons.md` (process memory), `acceptance/<unit>/` (held-out
tests, builder-protected), `reviews/<unit>.md`, `qa/<unit>.md`,
`gate/<unit>.json`, and terminal `NEEDS_ATTENTION.md` / `COMPLETION.md`.

`state.json`: `{ project, phase: intake|building|done, units:[{id,title,deps,status,iterations}], caps:{maxUsd}, escalations:[] }`. Unit status ∈ `pending|building|review|qa|fixing|verified|escalated|blocked`.

## The loop (per wave, up to `parallelism` units at once)
1. **Plan** — manager returns ready units (all deps verified) and marks
   dependents of escalated/blocked units as `blocked`.
2. **Build** — each unit in its own git worktree (Claude + Codex).
3. **Verify (parallel)** — Reviewer (spec + reward-hack), QA (runs it for real),
   and the independent Verifier (objective: real build/test exit codes, artifact
   existence, held-out acceptance tests, reward-hack scan). A unit passes ONLY if
   Reviewer = PASS **and** QA = PASS **and** the objective gate is clean
   (`build=0`, `test=0`, artifacts present, no reward-hack flags).
4. **Fix loop** — capped at a `usage`-derived iteration count; an identical
   failure signature twice → escalate early (oscillation).
5. **Integrate (serial — single git writer)** — merge the worktree, update docs +
   `lessons.md`, conventional-commit checkpoint + push.

When every unit verifies → a final **global end-to-end acceptance check** against
the master-spec → `phase: done` + `COMPLETION.md` + a desktop notification. On a
non-converging unit → it's marked `escalated`, dependents `blocked`,
`NEEDS_ATTENTION.md` written, and a notification sent.

## Verification is objective, not self-reported
The engine never accepts a unit on an agent's word. The independent Verifier runs
the build and tests itself — including held-out tests the builder cannot edit —
reports real exit codes and artifact existence, and scans the diff for
reward-hacking. Claude builds; a separate gate confirms.

## Isolation & original design
Every project is greenfield: agents don't read or borrow from other projects, and
the design is invented per project and never reused. The Reviewer blocks any
generic/templated/reused look as a HIGH finding.

## Autonomy, safety & resilience
- Full autonomy for the user's chosen config; `guardrails: standard` pauses once
  before deploy/destructive actions (for new users).
- Fetched web/reference content is untrusted **data**, never instructions
  (prompt-injection defense).
- A single-writer lock (`<project>/.factory.lock`) stops the cron heartbeat and a
  live run from double-building.
- The heartbeat (cron) resumes the engine across session/context resets and stops
  when `phase: done` or `NEEDS_ATTENTION.md` exists.
- Watchdog: per-unit iteration cap + oscillation detection. Real token/$ cost is
  tracked by the CLI; `caps.maxUsd` is an optional human-set ceiling.

## Start a project
```
/factory "<your idea + a few details>"
```
Add `--dry-run` (or ask to preview) to stop after the spec/design/plan for review,
without building. Run `eval/run-eval.workflow.js` to score the harness against the
golden task set.

## Status / roadmap
- [x] v1 — spec → build → review/QA → doc loop; Codex; usage/effort; design isolation
- [x] v2 — objective verifier gate, held-out tests, parallel worktree units,
      oscillation, blocked/done + notify, global acceptance check, constitution,
      lessons memory, injection defense, single-writer lock
- [x] eval golden-set + regression gate (`eval/`)
- [x] dry-run / preview mode
- [x] observability trace (`trace.jsonl`) + cheaper verify/plan routing
