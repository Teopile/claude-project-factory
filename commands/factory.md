---
description: Kick off an autonomous Project Factory build from a one-line idea.
argument-hint: <your idea + a few details>
---
The user wants to build a project autonomously with the Project Factory harness.
First read `~/.claude/project-factory/README.md` for the full contract, roster,
document set, loop, and policies.

Idea: $ARGUMENTS

Paths below use `~` (home) and `~/Projects` (projects root). Expand both to
ABSOLUTE paths when you call tools - the Workflow tool needs an absolute
`scriptPath` and an absolute `projectPath`.

Do this:

1. Scaffold. Choose a short slug `<name>`. Create `~/Projects/<name>/docs/` and
   seed it from `~/.claude/project-factory/templates/` (master-spec,
   design-direction, work-breakdown, decision-log, and state.json with the
   project name and phase `intake`).

2. Intake (Spec Architect). Launch the `factory-manager` agent to: research 3-6
   comparable products on the web; invent a bespoke `design-direction.md` from
   this idea's own concept; write the full doc set in extreme detail; then
   produce ONE batched round of detailed questions. Relay them to the user and
   wait. Fold answers in; repeat only if answers open genuinely new gaps. When
   the spec is 100%, set state.json `phase` to `building`. This is the only point
   you involve the human until completion. Keep the project greenfield - do not
   borrow from other local projects.

3. Build. Start the engine: call the Workflow tool with `scriptPath` = absolute
   path of `~/.claude/project-factory/engine/factory-loop.workflow.js` and
   `args: { "projectPath": "<absolute path of ~/Projects/<name>>", "maxIterations": 4 }`,
   run in the background.

4. Heartbeat. Create a cron (CronCreate) that re-runs the engine against the
   project until state.json `phase` is `done`, so the build survives session or
   context resets. Remove the cron on completion.

5. Report and go quiet. Tell the user the project path, the unit count, and that
   it's running. Do not prompt again until the engine reports completion or a
   genuine escalation (unresolvable ambiguity, a non-converging unit, or a hard
   budget cap).
