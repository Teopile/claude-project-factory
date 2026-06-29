# Project Factory â€” Autonomous Build Harness

A reusable, multi-agent pipeline that takes a short idea and drives it to a
completed, verified project with minimal human intervention.

Flow: **you give an idea â†’ Spec Architect writes exhaustive docs + asks you
everything â†’ you sign off â†’ the Manager runs a continuous build/review/test/doc
loop until the whole project is done â†’ only then does it come back to you.**

---

## Locked decisions (2026-06-29)

- **Models.** Primary builder/reasoner = Claude **Fable 5**. Co-builder =
  **Codex `gpt-5.5` @ `xhigh`** (config already in `~/.codex/config.toml`),
  invoked by the Builder via `codex exec`. Cheap fan-out subagents may use
  `haiku`. Never downgrade the main loop.
- **Run engine = Hybrid.** Each phase runs as a background **Workflow**; a
  **cron heartbeat** resumes the loop if a session/context resets. The build
  must survive restarts and run to completion unattended.
- **Autonomy = Full.** The system may install deps, run servers/tests/e2e,
  commit, push, open PRs, call paid APIs, and deploy â€” without asking. The
  Watchdog never asks permission; it only prevents *runaway* (non-converging
  loops, budget blowouts) and owns the single escalation gate.
- **Projects live in** `~/Projects/<name>/`. Stack is chosen
  per-project by the Spec Architect.
- **Everything runs at best-effort / "ultracode."** Every agent may spawn its
  own subagents, use skills, and run its own workflows.

---

## Agent roster

| Agent | Role | Key tools |
|---|---|---|
| **factory-manager** | Overseer. Owns the project + state, runs the loop, dispatches all others, owns budget/watchdog + the one escalation gate. First job per project = the Spec Architect intake phase. | all |
| **factory-builder** | Implements one doc unit â€” code + visuals + everything. Uses Fable 5 **and** Codex (`codex exec`), plus frontend/backend/db/test subagents. TDD. | all |
| **factory-reviewer** | Adversarially reviews each completed unit against the spec. Two independent passes must agree. Returns PASS/FAIL + findings to the Builder. | all |
| **factory-qa** | Tests each unit â€” manual + automation: smoke, regression, integration, e2e (Playwright), performance, stress, a11y, security. Returns results to Reviewer + Builder. | all |
| **factory-doc** | Keeps every doc true to reality: updates the spec, work-breakdown, decision log, and state as units complete. Drives the project to "fulfilled." | all |

The Spec Architect is the Manager's opening **phase**, not a separate file:
it researches competitors (web + deep-research), writes the full doc set, and
runs the clarifying-question round with the human until the spec is 100%.

---

## Document set (per project, in `Projects/<name>/docs/`)

- `master-spec.md` â€” the source of truth. Every page, route, screen, component,
  button behavior, state, data model, API contract, edge case, acceptance
  criteria. Extreme detail. Written for agents, not marketing.
- `design-direction.md` â€” the project's bespoke art direction, invented from its
  own concept. The single source of visual truth; supersedes any global/house
  style. Built fresh per project â€” never reuse another project's look.
- `work-breakdown.md` â€” the master-spec decomposed into dependency-ordered
  **units**, each with an id, acceptance criteria, and status.
- `state.json` â€” machine state for the loop (see schema below). Survives resets.
- `decision-log.md` â€” ADR-style record of every non-obvious choice + why.
- `reviews/<unit-id>.md`, `qa/<unit-id>.md` â€” per-unit verdicts and test reports.

### `state.json` schema
```json
{
  "project": "name",
  "phase": "intake|building|done",
  "units": [
    { "id": "U-001", "title": "...", "deps": [],
      "status": "pending|building|review|qa|fixing|verified",
      "iterations": 0, "lastVerdict": null }
  ],
  "budget": { "tokensSpent": 0, "usdSpent": 0, "maxUsd": null },
  "escalations": []
}
```

---

## The per-unit loop

For each unit in dependency order (run by the Manager / engine):

1. **Builder** implements the unit (Fable 5 + Codex), writes tests, makes it run.
2. **Reviewer** reviews against the unit's spec + acceptance criteria â†’ verdict.
3. **QA** runs every relevant test type â†’ report.
4. If Reviewer or QA = FAIL â†’ **Builder** fixes; loop 2â€“4. Watchdog caps this at
   **N iterations** (default 4) per unit before escalating.
5. On both PASS â†’ **factory-doc** updates docs + state; **Git** commits the
   verified checkpoint (and pushes/PRs per autonomy policy).
6. Manager advances to the next unit.

When all units are `verified` â†’ Manager marks `phase: done`, writes a completion
report, and only then surfaces to the human for small questions/polish.

### Handoff contract (every agent returns this)
```json
{ "unit": "U-001", "result": "PASS|FAIL", "summary": "...",
  "findings": [ { "severity": "critical|high|medium|low", "what": "...", "fix": "..." } ],
  "artifacts": ["paths..."], "nextAction": "advance|fix|escalate" }
```

---

## Autonomy & escalation

The system runs silent. It escalates to the human **only** when:
- a requirement is genuinely ambiguous and unresolvable from the spec, **or**
- the Watchdog detects a unit that won't converge after N iterations, **or**
- a single action would exceed the (optional) hard USD budget cap.

Everything else â€” installs, servers, tests, commits, pushes, PRs, paid API
calls, deploys â€” proceeds without asking.

### Watchdog / budget
- Per-unit iteration cap (default 4) â†’ escalate instead of looping forever.
- Oscillation detection: same failure signature twice â†’ escalate.
- Tracks tokens + USD in `state.json`; `maxUsd` is an optional hard stop.

---

## Context isolation & originality

Every project is greenfield. Agents confine file access to the project directory
and the harness docs; they do **not** read, copy, or take inspiration from other
projects under `Projects/`, and do **not** use cross-project memory â€” unless an
agent explicitly cites a specific reference for a specific reason. Competitor
research is web-based only.

Design is invented per project. The Spec Architect derives a unique art
direction (`design-direction.md`) from the idea itself; the Builder implements
that as the source of visual truth. Global/house design skills are used for
**craft only** â€” never to impose a recurring signature look. Never default to a
generic template or any prior project's palette, components, or layout.

## How to start a project

```
/factory "<your idea + a few details>"
```
The Manager opens with the Spec Architect intake: research, full doc set, then a
batched question round. Answer those once; after sign-off it runs to completion.

---

## Status / roadmap of the harness itself

- [x] Decisions locked, dirs scaffolded, Codex restored
- [x] `README.md` (this file)
- [x] Agent definitions: factory-manager / builder / reviewer / qa / doc
- [x] Document templates (master-spec, work-breakdown, review, qa, state, decisions)
- [x] Orchestrator workflow (`engine/factory-loop.workflow.js`)
- [x] `/factory` kickoff command (cron heartbeat wired at runtime)
- [ ] Dry-run smoke test on a tiny throwaway idea

