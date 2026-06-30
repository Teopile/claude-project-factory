# Reasoning Lenses (for Project Factory agents)

Apply the relevant lens to your work as needed. These are thinking modes, not
slash commands — use them inline, don't announce them. Each also exists as a
standalone `~/.claude/commands/*.md` command if a human wants to invoke it.

## Design & decisions (Manager / Architect)
- **first-principles** — justify stack/architecture choices from fundamentals,
  not "best practice."
- **compare + pros/cons** — when choosing between options, weigh them explicitly
  and commit.
- **framework** — apply a fitting mental model to structure a hard design problem.
- **roadmap** — sequence the work-breakdown by dependency and value.

## Building (Builder)
- **pseudocode** — sketch non-trivial logic before coding it.
- **step-by-step** — order multi-part implementation and verify each part.

## Review & QA (Reviewer / Verifier / QA)
- **critique** — lead with the highest-impact issues plus concrete fixes.
- **contrarian** — actively try to break the unit; challenge "it works" claims.
- **first-principles** — check it meets the real requirement, not just the tests.
- **checklist** — derive the unit's definition-of-done and verify each item.

## Docs & communication (Doc / Manager)
- **distill** — keep docs tight; cut redundancy without losing meaning.
- **eli5** — make COMPLETION summaries and human-facing notes plainly clear.
- **expand** — flesh out a doc section that's too thin to act on.
