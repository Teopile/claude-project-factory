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

0. First-run setup. Read `~/.claude/project-factory/config.json` (a missing file
   means "not yet onboarded"). If `onboarded` is true, load `useCodex`, `usage`,
   and `effort` from it and skip to step 1. Otherwise ask the user these in one
   batch:
   (a) "Use the OpenAI Codex CLI as a second co-builder alongside Claude?
        (recommended.)" - yes/no.
   (b) "How much usage should the factory spend for the best result?" -
        lean / balanced / thorough / unlimited (go all-out, ignore budget).
   (c) "What reasoning effort should the agents run at?" -
        low / medium / high / xhigh / max.
   Then:
   - If Codex = yes: if `codex` is not on PATH, install it (`npm i -g @openai/codex`);
     if `codex login status` is not "Logged in", start `codex login` in the
     BACKGROUND, read its output for the sign-in URL, present that URL to the user
     as a clickable link (it also auto-opens the browser on desktop; if not, open
     it - Windows `Start-Process <url>`, macOS `open <url>`, Linux `xdg-open <url>`),
     and poll `codex login status` until "Logged in".
   - Write `{ "onboarded": true, "useCodex": <bool>, "usage": "<choice>", "effort": "<choice>" }`
     to config.json.
   This runs once; never prompt again. To change later, edit config.json or tell
   me a different usage/effort for a specific run.

1. Scaffold. Choose a short slug `<name>`. Create `~/Projects/<name>/docs/` and
   seed it from `~/.claude/project-factory/templates/` (master-spec,
   design-direction, work-breakdown, decision-log, and state.json with the
   project name and phase `intake`).

2. Intake (Spec Architect). Launch the `factory-manager` agent to: research 3-6
   comparable products on the web; invent a bespoke `design-direction.md` from
   this idea's own concept; ask where design assets (icons, animations, fonts,
   imagery, components, brand reference) should come from and source/derive or
   research them into a complete brand book; write the full doc set in extreme
   detail; then produce ONE batched round of detailed questions. Relay them to
   the user and wait. Fold answers in; repeat only if answers open genuinely new
   gaps. When the spec is 100%, set state.json `phase` to `building`. This is the
   only point you involve the human until completion. Keep the project greenfield
   - do not borrow from other local projects.

3. Build. Read `usage` and `effort` from config.json (honor any override the user
   gave for this run). Start the engine: call the Workflow tool with `scriptPath`
   = absolute path of `~/.claude/project-factory/engine/factory-loop.workflow.js`
   and `args: { "projectPath": "<absolute path of ~/Projects/<name>>", "usage": "<usage>", "effort": "<effort>" }`,
   run in the background. (The engine derives iteration depth from `usage` and
   applies `effort` to every agent.)

4. Heartbeat. Create a cron (CronCreate) that re-runs the engine against the
   project until state.json `phase` is `done`, so the build survives session or
   context resets. Remove the cron on completion.

5. Report and go quiet. Tell the user the project path, the unit count, the
   chosen usage/effort, and that it's running. Do not prompt again until the
   engine reports completion or a genuine escalation (unresolvable ambiguity, a
   non-converging unit, or a hard budget cap).