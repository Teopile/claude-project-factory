export const meta = {
  name: 'project-factory-loop',
  description: 'Autonomous build loop v2: per ready unit, build in an isolated worktree, then Review + QA + an INDEPENDENT objective gate (real build/test exit codes, artifact existence, held-out acceptance tests, reward-hack scan) in parallel; fix until all pass or escalate; merge + doc + commit serially; detect oscillation; mark dependents blocked; notify on completion or attention; run a global end-to-end acceptance check before done. Effort/usage aware.',
  phases: [
    { title: 'Plan' },
    { title: 'Build' },
    { title: 'Verify' },
    { title: 'Integrate' },
    { title: 'Notify' },
  ],
}

// --- inputs -----------------------------------------------------------------
let _args = args
if (typeof _args === 'string') { try { _args = JSON.parse(_args) } catch (e) { _args = {} } }
_args = _args || {}
const projectPath = _args.projectPath
if (!projectPath) throw new Error('args.projectPath is required (got: ' + JSON.stringify(args) + ')')

const effort = _args.effort || 'high'                 // low | medium | high | xhigh | max
const usage = _args.usage || 'balanced'               // lean | balanced | thorough | unlimited
const verifyEffort = _args.verifyEffort || (effort === 'low' ? 'low' : 'high')
const USAGE = {
  lean:      { iters: 2, waves: 50,  par: 1, note: 'Usage=lean: economize - minimal fan-out, essential checks only.' },
  balanced:  { iters: 4, waves: 50,  par: 2, note: 'Usage=balanced: standard research and verification depth.' },
  thorough:  { iters: 6, waves: 75,  par: 3, note: 'Usage=thorough: extra research, more fan-out, deeper verification.' },
  unlimited: { iters: 8, waves: 200, par: 4, note: 'Usage=unlimited: go all-out - maximum fan-out, deepest research, exhaustive verification; do not economize.' },
}
const U = USAGE[usage] || USAGE.balanced
const maxIters = _args.maxIterations || U.iters
const maxWaves = _args.maxWaves || U.waves
const par = _args.parallelism || U.par

log(`effort=${effort} verify=${verifyEffort} usage=${usage} maxIters=${maxIters} parallelism=${par}`)

// --- schemas ----------------------------------------------------------------
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    units: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' } }, required: ['id', 'title'] } },
    summary: { type: 'object', properties: { verified: { type: 'number' }, pending: { type: 'number' }, blocked: { type: 'number' }, escalated: { type: 'number' }, allVerified: { type: 'boolean' } } },
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
  },
  required: ['unit', 'result'],
}
const GATE = {
  type: 'object',
  properties: {
    unit: { type: 'string' },
    ranCommands: { type: 'boolean' },
    buildExit: { type: 'number' },
    testExit: { type: 'number' },
    artifactsPresent: { type: 'boolean' },
    rewardHackFlags: { type: 'array', items: { type: 'string' } },
    evidence: { type: 'string' },
  },
  required: ['unit', 'buildExit', 'testExit', 'artifactsPresent', 'rewardHackFlags'],
}

// signature of a failure set, for oscillation detection
function sig(findings) {
  try { return JSON.stringify((findings || []).map(f => `${f.severity || ''}:${f.what || f.title || ''}`).sort()) }
  catch (e) { return '' }
}

// --- loop -------------------------------------------------------------------
const processed = []
let waves = 0
let needsAttention = false

while (waves < maxWaves) {
  waves++
  if (budget.total && budget.remaining() < 50_000) { log('Budget target nearly hit - stopping; heartbeat will resume.'); needsAttention = true; break }

  phase('Plan')
  const plan = await agent(
    `factory-manager: read ${projectPath}/docs/state.json and work-breakdown.md. Return up to ${par} units that are READY now (status not verified/escalated/blocked AND all deps verified), in dependency order. Also return a "summary" {verified,pending,blocked,escalated,allVerified} and the project "phase". Before returning, in state.json mark as "blocked" any not-yet-built unit that depends on an escalated or blocked unit. ${U.note}`,
    { agentType: 'factory-manager', phase: 'Plan', schema: PLAN_SCHEMA, effort: verifyEffort },
  )
  const units = (plan && plan.units) || []
  const sum = (plan && plan.summary) || {}

  if (!units.length) {
    if (sum.allVerified) log('All units verified - proceeding to final acceptance.')
    else { log(`No ready units; blocked=${sum.blocked || 0} escalated=${sum.escalated || 0}.`); needsAttention = ((sum.blocked || 0) + (sum.escalated || 0)) > 0 }
    break
  }
  log(`Wave ${waves}: building ${units.length} unit(s) concurrently.`)

  // Build + verify each ready unit concurrently; each builder runs in its own git worktree.
  const outcomes = await parallel(units.map(u => async () => {
    let verdict = 'FAIL', lastSig = null
    for (let iter = 1; iter <= maxIters; iter++) {
      await agent(
        `factory-builder: implement unit ${u.id} "${u.title}" per ${projectPath}/docs/master-spec.md + design-direction.md + constitution.md, in a clean worktree of ${projectPath}. ` +
          (iter > 1 ? `Fix iteration ${iter}: address ${projectPath}/docs/reviews/${u.id}.md, qa/${u.id}.md, and gate/${u.id}.json. ` : 'Begin from a clean tree. ') +
          `Do NOT modify the protected held-out tests in docs/acceptance/${u.id}/. Use Codex if enabled in config. Write tests and make build + tests pass. ${U.note}`,
        { agentType: 'factory-builder', label: `build:${u.id}#${iter}`, phase: 'Build', schema: HANDOFF, effort, isolation: 'worktree' },
      )

      const [review, qa, gate] = await parallel([
        () => agent(
          `factory-reviewer: adversarially review unit ${u.id} against master-spec + design-direction + constitution. Scan the diff for reward-hacking (weakened or deleted assertions, skipped/xfail tests, over-mocking, hardcoded expected values). Write ${projectPath}/docs/reviews/${u.id}.md. ${U.note}`,
          { agentType: 'factory-reviewer', label: `review:${u.id}#${iter}`, phase: 'Verify', schema: HANDOFF, effort },
        ),
        () => agent(
          `factory-qa: actually run and exercise unit ${u.id} (never infer results). Write ${projectPath}/docs/qa/${u.id}.md. ${U.note}`,
          { agentType: 'factory-qa', label: `qa:${u.id}#${iter}`, phase: 'Verify', schema: HANDOFF, effort },
        ),
        () => agent(
          `factory-verifier: INDEPENDENTLY and objectively verify unit ${u.id} in ${projectPath}. Run the build and the FULL test suite including the protected held-out tests in docs/acceptance/${u.id}/; capture the real exit codes; confirm every required artifact physically exists; scan the diff for reward-hacking. Do NOT trust the builder's claims - run the commands yourself. Write ${projectPath}/docs/gate/${u.id}.json.`,
          { agentType: 'factory-verifier', label: `gate:${u.id}#${iter}`, phase: 'Verify', schema: GATE, effort: verifyEffort },
        ),
      ])

      const objective = gate && gate.buildExit === 0 && gate.testExit === 0 && gate.artifactsPresent === true && (gate.rewardHackFlags || []).length === 0
      const pass = review && review.result === 'PASS' && qa && qa.result === 'PASS' && objective
      log(`unit ${u.id} iter ${iter}: review=${review && review.result} qa=${qa && qa.result} build=${gate && gate.buildExit} test=${gate && gate.testExit} arts=${gate && gate.artifactsPresent} hacks=${gate && (gate.rewardHackFlags || []).length}`)
      if (pass) { verdict = 'PASS'; break }

      const s = sig([...((review && review.findings) || []), ...((qa && qa.findings) || []), ...(((gate && gate.rewardHackFlags) || []).map(x => ({ what: x })))])
      if (s && s === lastSig) { log(`unit ${u.id}: identical failure signature twice - escalating early (oscillation).`); break }
      lastSig = s
    }
    return { u, verdict }
  }))

  // Integrate serially so git has a single writer: merge + doc + commit each pass; escalate each fail.
  for (const o of (outcomes || []).filter(Boolean)) {
    if (o.verdict === 'PASS') {
      phase('Integrate')
      await agent(
        `factory-doc: unit ${o.u.id} passed Review + QA + the objective gate. Merge its worktree branch into the main tree (resolve any conflicts; if the merge or post-merge build/tests fail, do NOT mark verified - report a failure so it re-enters the loop). Update master-spec/design-direction if reality changed; set the unit "verified" in state.json (validate the JSON after writing); append a PROCESS lesson (not visual/style) to docs/lessons.md; update decision-log + work-breakdown; then make a conventional-commit checkpoint and push per the autonomy policy.`,
        { agentType: 'factory-doc', label: `doc:${o.u.id}`, phase: 'Integrate', effort: verifyEffort },
      )
      processed.push({ unit: o.u.id, status: 'verified' })
    } else {
      await agent(
        `factory-manager: unit ${o.u.id} did not converge. Set it "escalated" in state.json, mark its dependents "blocked", and append a clear escalation entry (blocking findings + exactly what you need from the human).`,
        { agentType: 'factory-manager', label: `escalate:${o.u.id}`, phase: 'Integrate', effort: verifyEffort },
      )
      processed.push({ unit: o.u.id, status: 'escalated' })
      needsAttention = true
    }
  }
}

// --- terminal: notify + final acceptance ------------------------------------
phase('Notify')
if (needsAttention) {
  await agent(
    `factory-manager: this run needs human attention (escalated/blocked units or a budget stop). Write ${projectPath}/docs/NEEDS_ATTENTION.md summarizing what is blocked and the exact questions for the human, and send a desktop notification. Do NOT set phase to done.`,
    { agentType: 'factory-manager', label: 'notify:attention', phase: 'Notify', effort: verifyEffort },
  )
} else {
  await agent(
    `factory-manager: every unit is verified. Run a FINAL end-to-end acceptance check of the assembled app against the master-spec GLOBAL acceptance criteria and the original idea (build it, run it, exercise the whole thing). If it passes: set state.json phase to "done", write docs/COMPLETION.md, and send a "project complete" desktop notification. If it fails: append the gaps as new units, leave phase as "building", and write docs/NEEDS_ATTENTION.md only if a human decision is required.`,
    { agentType: 'factory-manager', label: 'notify:done', phase: 'Notify', effort },
  )
}

return { projectPath, effort, usage, parallelism: par, waves, processed, needsAttention }
