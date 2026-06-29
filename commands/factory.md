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

0. First-run setup (Codex co-builder). Read `~/.claude/project-factory/config.json`
   (treat a missing file as "not yet onboarded"). If `onboarded` is true, skip to
   step 1. Otherwise ask the user ONE yes/no question:
   "Use the OpenAI Codex CLI as a second co-builder alongside Claude?
   (recommended - a second model cross-checks the hard parts.)"
   - If NO: write `{ "onboarded": true, "useCodex": false }` to config.json; go to step 1.
   - If YES:
       a. If `codex` is not on PATH, install it: `npm i -g @openai/codex`.
       b. Run `codex login status`. If it does NOT say "Logged in", sign them in:
          start `codex login` in the BACKGROUND, read its output for the sign-in
          URL, and present that URL to the user as a clickable link to finish
          sign-in (on a desktop it also auto-opens the browser; if it does not,
          open it for them - Windows `Start-Process <url>`, macOS `open <url>`,
          Linux `xdg-open <url>`). Poll `codex login status` until it reports
          "Logged in" (give them time to finish in the browser).
       c. Write `{ "onboarded": true, "useCodex": true }` to config.json.
   This onboarding runs only once; never prompt again on later projects.

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