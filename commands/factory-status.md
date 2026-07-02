---
description: Show the status of a Project Factory build.
argument-hint: <project name>
---
Report the status of the factory project at ~/Projects/$ARGUMENTS (expand ~ to an
absolute path). READ ONLY - change nothing.

Read:
- docs/state.json -> phase, and counts of units by status
  (verified / pending / building / review / qa / fixing / blocked / escalated).
- .factory.lock -> its age. Fresh (< ~5 min) = engine likely ALIVE; stale
  (> 45 min) or absent = STOPPED.
- docs/trace.jsonl (if present) -> the last few lines = most recent unit activity
  and timing.
- docs/NEEDS_ATTENTION.md / MILESTONE.md / COMPLETION.md -> whether it's waiting on
  the human, at a milestone gate, or done.

Report concisely: phase; X/Y units verified (plus any blocked/escalated); engine
ALIVE or STOPPED (with lock age); last activity; and the recommended next action
(e.g. "stopped mid-build -> /factory resume $ARGUMENTS", "waiting for approval ->
see MILESTONE.md", "done -> see COMPLETION.md", "blocked -> see NEEDS_ATTENTION.md").