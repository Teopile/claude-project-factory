export const meta = {
  name: 'project-factory-loop',
  description: 'Autonomous build loop: for each ready spec unit, build (Fable 5 + Codex) then review + QA in parallel, fix until both PASS, then update docs and commit. Drains the dependency graph wave by wave. Respects per-project effort and usage levels.',
  phases: [
    { title: 'Plan' },
    { title: 'Build' },
    { title: 'Verify' },
    { title: 'Document' },
  ],
}

// --- inputs -----------------------------------------------------------------
let _args = args
if (typeof _args === 'string') { try { _args = JSON.parse(_args) } catch (e) { _args = {} } }
_args = _args || {}
const projectPath = _args.projectPath
if (!projectPath) throw new Error('args.projectPath is required (got: ' + JSON.stringify(args) + ')')

const effort = _args.effort || 'high'      // low | medium | high | xhigh | max
const usage = _args.usage || 'balanced'    // lean | balanced | thorough | unlimited
const USAGE = {
  lean:      { iters: 2, waves: 50,  note: 'Usage=lean: economize - minimal subagent fan-out, only essential checks.' },
  balanced:  { iters: 4, waves: 50,  note: 'Usage=balanced: standard research and verification depth.' },
  thorough:  { iters: 6, waves: 75,  note: 'Usage=thorough: extra research, more fan-out, deeper verification.' },
  unlimited: { iters: 8, waves: 200, note: 'Usage=unlimited: go all-out - maximum fan-out, deepest research, exhaustive verification; do not economize on usage.' },
}
const U = USAGE[usage] || USAGE.balanced
const maxIters = _args.maxIterations || U.iters
const maxWaves = _args.maxWaves || U.waves

log(`effort=${effort} usage=${usage} maxIters=${maxIters} maxWaves=${maxWaves}`)

// --- schemas ----------------------------------------------------------------
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    units: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' } }, required: ['id', 'title'] } },
    phase: { type: 'string' },
  },
  required: ['units'],
}
const HANDOFF = {
  type: 'object',
  properties: {
    unit: { type: 'string' },
    result: { type: 'string', enum: ['PASS', 'FAIL'] },
    summary: { type: 'string' },
    findings: { type: 'array', items: { type: 'object', additionalProperties: true } },
    nextAction: { type: 'string' },
  },
  required: ['unit', 'result'],
}

// --- loop -------------------------------------------------------------------
const processed = []
let waves = 0

while (waves < maxWaves) {
  waves++
  if (budget.total && budget.remaining() < 50_000) { log('Budget nearly exhausted - stopping this run; heartbeat will resume later.'); break }

  phase('Plan')
  const plan = await agent(
    `You are the factory-manager. Read ${projectPath}/docs/state.json and ${projectPath}/docs/work-breakdown.md. ` +
      `Return units whose status is not "verified" and not "escalated", and whose deps are ALL verified - ready to build now, in dependency order. ` +
      `Also return the project "phase". If nothing is ready, return an empty units array. ${U.note}`,
    { agentType: 'factory-manager', phase: 'Plan', schema: PLAN_SCHEMA, effort },
  )
  const units = (plan && plan.units) || []
  if (!units.length) { log(`No ready units (phase=${plan && plan.phase}). Drain complete for this run.`); break }
  log(`Wave ${waves}: ${units.length} ready unit(s).`)

  for (const u of units) {
    if (budget.total && budget.remaining() < 50_000) { log('Budget guard hit mid-wave.'); break }

    let verdict = 'FAIL'
    for (let iter = 1; iter <= maxIters; iter++) {
      phase('Build')
      await agent(
        `factory-builder: implement unit ${u.id} "${u.title}" per ${projectPath}/docs/master-spec.md and ${projectPath}/docs/design-direction.md, in project dir ${projectPath}. ` +
          (iter > 1 ? `Fix iteration ${iter}: address the findings in ${projectPath}/docs/reviews/${u.id}.md and ${projectPath}/docs/qa/${u.id}.md. ` : '') +
          `Use Codex (if enabled in config) for hard parts; remain the sole filesystem writer. Write tests and make it run. ${U.note}`,
        { agentType: 'factory-builder', label: `build:${u.id}#${iter}`, phase: 'Build', schema: HANDOFF, effort },
      )

      phase('Verify')
      const [review, qa] = await parallel([
        () => agent(
          `factory-reviewer: adversarially review unit ${u.id} against ${projectPath}/docs/master-spec.md and design-direction.md. Write the verdict to ${projectPath}/docs/reviews/${u.id}.md. ${U.note}`,
          { agentType: 'factory-reviewer', label: `review:${u.id}#${iter}`, phase: 'Verify', schema: HANDOFF, effort },
        ),
        () => agent(
          `factory-qa: test unit ${u.id} in ${projectPath} (smoke, functional, regression, integration, performance, stress, a11y, security as relevant). Write the report to ${projectPath}/docs/qa/${u.id}.md. ${U.note}`,
          { agentType: 'factory-qa', label: `qa:${u.id}#${iter}`, phase: 'Verify', schema: HANDOFF, effort },
        ),
      ])

      const pass = review && review.result === 'PASS' && qa && qa.result === 'PASS'
      log(`unit ${u.id} iter ${iter}: review=${review && review.result} qa=${qa && qa.result}`)
      if (pass) { verdict = 'PASS'; break }
    }

    if (verdict === 'PASS') {
      phase('Document')
      await agent(
        `factory-doc: unit ${u.id} passed review + QA. Update ${projectPath}/docs/master-spec.md and design-direction.md if reality changed, set the unit to "verified" in ${projectPath}/docs/state.json, append any newly-surfaced units, update decision-log + work-breakdown, then make a conventional-commit checkpoint (push per the autonomy policy).`,
        { agentType: 'factory-doc', label: `doc:${u.id}`, phase: 'Document', effort },
      )
      processed.push({ unit: u.id, status: 'verified' })
    } else {
      await agent(
        `factory-manager: unit ${u.id} did not converge after ${maxIters} iterations. Set its status to "escalated" in ${projectPath}/docs/state.json and append a clear escalation entry (blocking findings + what you need from the human).`,
        { agentType: 'factory-manager', label: `escalate:${u.id}`, phase: 'Document', effort },
      )
      processed.push({ unit: u.id, status: 'escalated' })
    }
  }
}

return { projectPath, effort, usage, waves, processed }
