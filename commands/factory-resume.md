---
description: Resume a stalled or paused Project Factory build.
argument-hint: <project name>
---
Resume the factory project at ~/Projects/$ARGUMENTS (expand ~ to an absolute path).

1. Read docs/state.json and check the terminal files:
   - phase "done" -> already complete (see COMPLETION.md); stop.
   - docs/NEEDS_ATTENTION.md exists -> summarize what's blocking; do NOT relaunch
     until the human resolves it.
   - docs/MILESTONE.md exists -> a milestone gate awaiting approval; confirm the
     user approves, then remove MILESTONE.md and resume with "milestoneApproved":
     true.
2. Lock check: if .factory.lock is fresher than 45 min, an engine is already
   running - do NOT relaunch. Otherwise write a fresh lock (current UTC timestamp).
3. Read usage/effort/reviewGates from ~/.claude/project-factory/config.json.
4. Relaunch the engine: Workflow tool, scriptPath = the absolute path of
   ~/.claude/project-factory/engine/factory-loop.workflow.js, args
   { "projectPath": "<abs ~/Projects/$ARGUMENTS>", "usage": "..", "effort": "..",
   "reviewGates": ".." (+ "milestoneApproved": true if resuming a milestone) },
   run in the background. The engine re-plans from state.json and skips verified
   units - only the pending ones get built.
5. Ensure a heartbeat cron is active (create it per the /factory heartbeat step if
   none exists) so it keeps going across resets.
6. Report the units remaining and that it's resuming; then go quiet until the
   engine writes COMPLETION.md, MILESTONE.md, or NEEDS_ATTENTION.md.