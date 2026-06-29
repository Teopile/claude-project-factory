export const meta = {
  name: 'project-factory-loop',
  description: 'Autonomous build loop: for each ready spec unit, build (Fable 5 + Codex) then review + QA in parallel, fix until both PASS, then update docs and commit. Drains the dependency graph wave by wave.',
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
const maxIters = _args.maxIterations || 4
const maxWaves = _args.maxWaves || 50
if (!projectPath) throw new Error('args.projectPath is required (got: ' + JSON.stringify(args) + ')')

// --- schemas ----------------------------------------------------------------
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    units: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, title: { type: 'string' } },
        required: ['id', 'title'],
      },
    },
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

  // budget guard (no-op when no target is set; remaining() === Infinity)
  if (budget.total && budget.remaining() < 50_000) {
    log('Budget nearly exhausted — stopping this run; heartbeat will resume later.')
    break
  }

  // PLAN: ask the manager for the next wave of ready, non-escalated units
  phase('Plan')
  const plan = await agent(
    `You are the factory-manager. Read ${projectPath}/docs/state.json and ${projectPath}/docs/work-breakdown.md. ` +
      `Return units whose status is not "verified" and not "escalated", and whose deps are ALL verified — i.e. ready to build now, in dependency order. ` +
      `Also return the project "phase". If nothing is ready, return an empty units array.`,
    { agentType: 'factory-manager', phase: 'Plan', schema: PLAN_SCHEMA },
  )
  const units = (plan && plan.units) || []
  if (!units.length) {
    log(`No ready units (phase=${plan && plan.phase}). Draining complete for this run.`)
    break
  }
  log(`Wave ${waves}: ${units.length} ready unit(s).`)

  // Process each ready unit: build -> (review || qa) -> fix-loop -> document
  for (const u of units) {
    if (budget.total && budget.remaining() < 50_000) { log('Budget guard hit mid-wave.'); break }

    let verdict = 'FAIL'
    for (let iter = 1; iter <= maxIters; iter++) {
      phase('Build')
      await agent(
        `factory-builder: implement unit ${u.id} "${u.title}" per ${projectPath}/docs/master-spec.md in project dir ${projectPath}. ` +
          (iter > 1 ? `This is fix iteration ${iter}: address the findings in ${projectPath}/docs/reviews/${u.id}.md and ${projectPath}/docs/qa/${u.id}.md. ` : '') +
          `Use Codex (codex exec, gpt-5.5 xhigh) as co-builder for hard parts; you remain the sole filesystem writer. Write tests and make it run.`,
        { agentType: 'factory-builder', label: `build:${u.id}#${iter}`, phase: 'Build', schema: HANDOFF },
      )

      phase('Verify')
      const [review, qa] = await parallel([
        () => agent(
          `factory-reviewer: adversarially review unit ${u.id} against its spec in ${projectPath}/docs/master-spec.md. Write the verdict to ${projectPath}/docs/reviews/${u.id}.md.`,
          { agentType: 'factory-reviewer', label: `review:${u.id}#${iter}`, phase: 'Verify', schema: HANDOFF },
        ),
        () => agent(
          `factory-qa: test unit ${u.id} in ${projectPath} (smoke, functional, regression, integration, performance, stress, a11y, security as relevant). Write the report to ${projectPath}/docs/qa/${u.id}.md.`,
          { agentType: 'factory-qa', label: `qa:${u.id}#${iter}`, phase: 'Verify', schema: HANDOFF },
        ),
      ])

      const pass = review && review.result === 'PASS' && qa && qa.result === 'PASS'
      log(`unit ${u.id} iter ${iter}: review=${review && review.result} qa=${qa && qa.result}`)
      if (pass) { verdict = 'PASS'; break }
    }

    if (verdict === 'PASS') {
      phase('Document')
      await agent(
        `factory-doc: unit ${u.id} passed review + QA. Update ${projectPath}/docs/master-spec.md (if reality changed), set the unit to "verified" in ${projectPath}/docs/state.json, append any newly-surfaced units, update decision-log + work-breakdown, then make a conventional-commit checkpoint (and push per the autonomy policy).`,
        { agentType: 'factory-doc', label: `doc:${u.id}`, phase: 'Document' },
      )
      processed.push({ unit: u.id, status: 'verified' })
    } else {
      await agent(
        `factory-manager: unit ${u.id} did not converge after ${maxIters} iterations. Set its status to "escalated" in ${projectPath}/docs/state.json and append a clear escalation entry (the blocking findings + what you need from the human).`,
        { agentType: 'factory-manager', label: `escalate:${u.id}`, phase: 'Document' },
      )
      processed.push({ unit: u.id, status: 'escalated' })
    }
  }
}

return { projectPath, waves, processed }
