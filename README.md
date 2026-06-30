# Claude Project Factory

Turn a one-line idea into a finished, verified project — autonomously.

Project Factory is a multi-agent harness for **[Claude Code](https://claude.com/claude-code)**.
You give it an idea; it researches the space, writes an exhaustive spec, invents a
**bespoke** design, then runs a continuous **build → review → QA → document** loop
until the whole thing is built and verified — surviving session resets and asking
you almost nothing along the way.

> Primary builder: Claude (Fable 5). Optional co-builder: OpenAI Codex (`gpt-5.5`).

## How it works

1. `/factory "your idea"`.
2. The **Spec Architect** researches competitors (web only), writes the full doc
   set — master spec, a from-scratch `design-direction.md`, and a
   dependency-ordered work breakdown — and asks you one batched round of
   questions.
3. You answer once. It flips to autonomous mode.
4. For every unit of work: the **Builder** implements it (Claude + Codex), then
   the **Reviewer** (adversarial, two passes that must agree) and **QA** (manual +
   automated: smoke, regression, integration, e2e, performance, stress,
   accessibility, security) verify it in parallel, looping fixes until both pass;
   then **Doc** updates the docs and commits a checkpoint.
5. When every unit is verified, it reports back.

Five agents, one engine, full autonomy with a watchdog. Architecture lives in
[`project-factory/README.md`](project-factory/README.md).

## Why each project looks different

Project Factory deliberately starts every project greenfield. Agents are walled
off from your other repositories and from a recurring "house style" — the Spec
Architect invents a unique art direction from each idea's own concept, and the
Reviewer blocks any generic or reused look. No two builds wear the same skin.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- Node.js 18+ and Git
- *(Optional)* [Codex CLI](https://www.npmjs.com/package/@openai/codex) for the
  second-model co-builder: `npm i -g @openai/codex`. Without it, the Builder
  runs Claude-only. The first `/factory` run offers to install Codex and sign you in.

## Install

```bash
git clone https://github.com/Teopile/claude-project-factory
cd claude-project-factory
# Windows (PowerShell):
pwsh ./install.ps1
# macOS / Linux:
./install.sh
```

The installer copies the agents, the `/factory` command, and the engine into your
`~/.claude/`, so they're available in any Claude Code session.

## Usage

```
/factory "a habit tracker for runners with a weekly streak view and CSV export"
```

Answer the intake questions once, then let it run. Built projects land in
`~/Projects/<name>/` with their full `docs/` set and git history.

## Configuration

- **Projects root** — defaults to `~/Projects`; change it in `commands/factory.md`.
- **Codex** — used automatically if `codex` is on your PATH; skipped otherwise.
- **Usage & effort** - set on first run (lean/balanced/thorough/unlimited and low->max); stored in config.json.
- **Autonomy & budget** — see the policy section of `project-factory/README.md`.

## Command library (bundled)

Installing the factory also drops a set of general-purpose slash commands into
`~/.claude/commands/` - quick thinking lenses and modes you can use any time,
which the factory's own agents also apply internally (see
`project-factory/lenses.md`):

- Thinking: `/firstprinciples` `/contrarian` `/critique` `/proscons` `/compare` `/deepdive` `/analyst` `/optimizer`
- Modes: `/eli5` `/brief` `/minimal` `/expand` `/distill` `/stepbystep` `/checklist` `/ghost` `/pseudocode`
- Planning: `/roadmap` `/playbook` `/framework`
- Productivity: `/prioritize` `/decide` `/delegate` `/weeklyreview`
- Learning: `/quiz` `/studyplan` `/feynman` `/flashcards`
- Eng shortcuts: `/debug` `/refactor` `/security` `/testcases` `/optimizecode`

## Status

Early but working — proven end-to-end on its first real build. This is meant to
grow; issues and PRs welcome.

## License

[MIT](LICENSE) © Theo (@Teopile)
