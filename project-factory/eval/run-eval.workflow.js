export const meta = {
  name: 'project-factory-eval',
  description: 'Harness self-eval: build each golden task fresh and run it through the independent objective gate (real build/test exit codes, artifacts, reward-hack scan); return a pass-rate scorecard and flag regressions.',
  phases: [
    { title: 'Load' },
    { title: 'Build' },
    { title: 'Gate' },
    { title: 'Score' },
  ],
}

let _args = args
if (typeof _args === 'string') { try { _args = JSON.parse(_args) } catch (e) { _args = {} } }
_args = _args || {}
const evalDir = _args.evalDir || '~/.claude/project-factory/eval'
const workDir = _args.workDir || '~/Projects/_factory-eval'
const effort = _args.effort || 'high'
const threshold = _args.threshold || 1.0

const TASKS = {
  type: 'object',
  properties: {
    tasks: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, prompt: { type: 'string' }, stack: { type: 'string' }, acceptance: { type: 'array', items: { type: 'string' } } }, required: ['id', 'prompt', 'acceptance'] } },
  },
  required: ['tasks'],
}
const GATE = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    buildExit: { type: 'number' },
    testExit: { type: 'number' },
    artifactsPresent: { type: 'boolean' },
    rewardHackFlags: { type: 'array', items: { type: 'string' } },
    pass: { type: 'boolean' },
    note: { type: 'string' },
  },
  required: ['id', 'pass'],
}

phase('Load')
const loaded = await agent(
  `Read ${evalDir}/golden-tasks.json and return its tasks array verbatim.`,
  { agentType: 'factory-manager', phase: 'Load', schema: TASKS, effort: 'low' },
)
const tasks = (loaded && loaded.tasks) || []
log(`${tasks.length} golden task(s).`)

const results = await parallel(tasks.map(t => async () => {
  const dir = `${workDir}/${t.id}`
  await agent(
    `factory-builder: build this task fresh in ${dir} (its own directory) to its acceptance criteria. Task: ${t.prompt} Stack: ${t.stack || 'vanilla'}. Acceptance: ${(t.acceptance || []).join('; ')}. Write tests and make build + tests pass. Do not look at other projects.`,
    { agentType: 'factory-builder', label: `eval-build:${t.id}`, phase: 'Build', effort },
  )
  const g = await agent(
    `factory-verifier: independently verify the task in ${dir}. Run the build and tests, capture real exit codes, confirm artifacts exist, scan for reward-hacking. Acceptance: ${(t.acceptance || []).join('; ')}. Set pass = (buildExit===0 && testExit===0 && artifactsPresent && no reward-hack flags && every acceptance criterion met).`,
    { agentType: 'factory-verifier', label: `eval-gate:${t.id}`, phase: 'Gate', schema: GATE, effort: 'high' },
  )
  return { id: t.id, pass: !!(g && g.pass), buildExit: g && g.buildExit, testExit: g && g.testExit, hacks: g && (g.rewardHackFlags || []).length, note: g && g.note }
}))

phase('Score')
const scored = (results || []).filter(Boolean)
const passed = scored.filter(r => r.pass).length
const rate = scored.length ? passed / scored.length : 0
log(`Score: ${passed}/${scored.length} (${Math.round(rate * 100)}%) threshold=${threshold}`)

return { total: scored.length, passed, rate, threshold, regression: rate < threshold, results: scored }
