---
description: Optimize code for performance.
argument-hint: <code or hotspot>
---
Optimize the performance of the following. Use the `performance-optimizer` skill
if available; otherwise apply its method: $ARGUMENTS

Find the real bottleneck first (don't micro-optimize cold paths); fix
algorithmic issues and N+1s before constants; reason about or measure the gain;
note any readability/maintainability trade-off.
