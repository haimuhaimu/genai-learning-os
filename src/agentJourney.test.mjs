import test from 'node:test'
import assert from 'node:assert/strict'
import { playgroundReplayURL } from './playgroundReplay.ts'

const api = await import('./agentJourney.ts').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('/agentJourney.ts')) return {}
  throw error
})

const requestId = 'agent-request-0123456789'
const empty = () => ({ schemaVersion: 1 })
const fixture = (producer = 'browser-session') => ({
  format: 'algorithm-playground/learning-run', schemaVersion: 1, experimentId: 'agent-tool-loop', engineVersion: 'agent-tool-loop-v1', producer,
  fixture: { id: 'supply-receipt-v1', toolBudget: 3, initialToolStatus: 'accepted' },
  actions: ['stop', 'restart', 'check', 'retry', 'check'].map(action => ({ action })),
  steps: [
    { action: 'stop', trial: 1, remaining: 3, observation: 'stopped' },
    { action: 'restart', trial: 2, remaining: 3, observation: 'restarted' },
    { action: 'check', trial: 2, remaining: 2, observation: 'not-delivered' },
    { action: 'retry', trial: 2, remaining: 1, observation: 'retry-accepted' },
    { action: 'check', trial: 2, remaining: 0, observation: 'signed' },
  ],
  result: { stage: 'done', workflowComplete: true, mastery: 'not-assessed', evidence: { trials: [
    { number: 1, outcome: 'stopped', toolCalls: 0, receipt: 'unknown', backupDispatched: false },
    { number: 2, outcome: 'verified', toolCalls: 3, receipt: 'delivered', backupDispatched: true },
  ] }, availableActions: [] },
})
const envelope = (receipt = fixture()) => ({ format: 'genai-learning-os/playground-handoff', schemaVersion: 1, journeyId: 'agent-learning', requestId, receipt })
const json = JSON.stringify
const storage = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) } }

test('Agent launch constrains the game and the exact return route without mutating state', () => {
  assert.equal(typeof api.startAgentLaunch, 'function')
  const state = empty()
  const launched = api.startAgentLaunch(state, 'http://127.0.0.1:3103/', 'http://127.0.0.1:3102/?unrelated=1#ignored', requestId)
  const url = new URL(launched.url)
  assert.equal(url.pathname, '/agent-mission.html')
  assert.equal(url.hash, '#mission')
  assert.equal(url.searchParams.get('genaiJourney'), 'agent-learning')
  assert.equal(url.searchParams.get('genaiRequest'), requestId)
  assert.equal(url.searchParams.get('genaiReturn'), 'http://127.0.0.1:3102/?page=routes&section=agent-journey')
  assert.deepEqual(launched.state, { schemaVersion: 1, pendingRequest: requestId })
  assert.deepEqual(state, empty())
  assert.throws(() => api.startAgentLaunch(state, 'https://example.org/', 'http://127.0.0.1:3102/', requestId))
  assert.throws(() => api.startAgentLaunch(state, 'https://haimuhaimu.github.io/algorithm-playground/', 'https://haimuhaimu.github.io/other/', requestId))
})

test('automatic return requires a matching request-bound Agent envelope; raw JSON is manual only', () => {
  assert.equal(typeof api.parseAgentImport, 'function')
  const opts = { expectedRequest: requestId, requireHandoff: true }
  assert.equal(api.parseAgentImport(json(envelope()), opts).experimentId, 'agent-tool-loop')
  assert.throws(() => api.parseAgentImport(json(envelope()), { ...opts, expectedRequest: 'newer-request-1234567' }), /本轮/)
  assert.throws(() => api.parseAgentImport(json({ ...envelope(), journeyId: 'model-learning' }), opts), /不属于/)
  assert.throws(() => api.parseAgentImport(json(fixture()), opts), /返程/)
  assert.equal(api.parseAgentImport(json(fixture())).experimentId, 'agent-tool-loop')
})

test('Agent imports reject unrelated experiments, unsafe JSON and journals beyond their limits', () => {
  assert.equal(typeof api.parseAgentImport, 'function')
  for (const bad of [
    '', '{', '很'.repeat(21846), '{"__proto__":{}}',
    json({ ...fixture(), experimentId: 'bayes-update' }),
    json({ ...fixture(), engineVersion: 'agent-tool-loop-v2' }),
    json({ ...fixture(), producer: ['browser-session'] }),
    json({ ...fixture(), actions: Array(10).fill({ action: 'check' }) }),
    json({ ...fixture(), actions: [{ action: 'check', url: 'https://example.org/' }] }),
  ]) assert.throws(() => api.parseAgentImport(bad))
})

test('summary preserves both outcomes and shows retry acknowledgement separately from signing', () => {
  assert.equal(typeof api.summarizeAgentRun, 'function')
  const summary = api.summarizeAgentRun(fixture())
  assert.equal(summary.complete, true)
  assert.deepEqual(summary.trials.map(trial => [trial.outcome, trial.receipt, trial.toolCalls]), [['stopped', 'unknown', 0], ['verified', 'delivered', 3]])
  assert.deepEqual(summary.steps.slice(2).map(step => step.observation), ['not-delivered', 'retry-accepted', 'signed'])
  const bad = fixture()
  bad.result.evidence.trials[1].receipt = 'unknown'
  assert.throws(() => api.summarizeAgentRun(bad), /签收/)
})

test('only a successful replay can produce review data; mismatch never becomes a verified record', async () => {
  assert.equal(typeof api.verifyAgentRecord, 'function')
  const valid = json(fixture())
  const verified = await api.verifyAgentRecord(valid, receipt => ({ matches: true, authenticatesUser: false, receipt }))
  assert.equal(verified.summary.trials[1].outcome, 'verified')
  await assert.rejects(api.verifyAgentRecord(valid, () => { throw Error('recomputed evidence differs') }), /differs/)
  await assert.rejects(api.verifyAgentRecord(valid, receipt => ({ matches: true, authenticatesUser: true, receipt })))
  await assert.rejects(api.verifyAgentRecord(valid, receipt => ({ matches: true, authenticatesUser: false, receipt: { ...receipt, producer: 'agent' } })))
})

test('review data from agent and unfinished runs cannot replace personally confirmed practice', () => {
  assert.equal(typeof api.recordAgentPractice, 'function')
  assert.throws(() => api.recordAgentPractice(empty(), fixture('agent'), true), /亲手/)
  assert.throws(() => api.recordAgentPractice(empty(), fixture(), false), /亲手/)
  const partial = fixture()
  partial.actions = partial.actions.slice(0, 1)
  partial.steps = partial.steps.slice(0, 1)
  partial.result = { ...partial.result, stage: 'mission', workflowComplete: false, evidence: { trials: partial.result.evidence.trials.slice(0, 1) }, availableActions: [{ action: 'restart' }] }
  assert.throws(() => api.recordAgentPractice(empty(), partial, true), /亲手/)
})

test('independent Agent storage reloads practice and reflection, leaving existing progress untouched', () => {
  assert.equal(typeof api.recordAgentPractice, 'function')
  const db = storage()
  const prior = ['genai-model-learning-journey-v1', 'genai-bayes-learning-journey-v1', 'genai-learning-progress-v1', 'genai-current-learning-journey-v1']
  for (const key of prior) db.setItem(key, 'leave-unchanged')
  const practice = api.recordAgentPractice(empty(), fixture(), true)
  assert.throws(() => api.saveAgentReflection(empty(), 'signed'))
  const wrong = api.saveAgentReflection(practice, 'accepted')
  assert.equal(api.deriveAgentStatus(wrong).complete, false)
  const good = api.saveAgentReflection(wrong, 'signed')
  assert.deepEqual(api.deriveAgentStatus(good), { practiced: true, reflected: true, complete: true, mastery: 'not-assessed' })
  assert.equal(api.writeAgentJourney(good, db), true)
  assert.deepEqual(api.readAgentJourney(db), good)
  assert.deepEqual(api.recordAgentPractice(good, fixture(), true), good)
  for (const key of prior) assert.equal(db.getItem(key), 'leave-unchanged')
  assert.equal(api.writeAgentJourney(empty(), { setItem() { throw Error('quota') } }), false)
  assert.deepEqual(api.readAgentJourney(db), good)
  const corrupted = structuredClone(good)
  corrupted.practice.receipt.steps[4].observation = 'retry-accepted'
  assert.deepEqual(api.readAgentJourney({ getItem: () => json(corrupted) }), empty())
})

test('Agent replay loads its versioned module without changing the other routes', () => {
  assert.equal(playgroundReplayURL('agent-tool-loop', 'http://127.0.0.1:3103/'), 'http://127.0.0.1:3103/learning-tool.mjs?v=agent-tool-loop-v1')
  assert.equal(playgroundReplayURL('learning-route'), 'https://haimuhaimu.github.io/algorithm-playground/learning-tool.mjs')
  assert.equal(playgroundReplayURL('bayes-update'), 'https://haimuhaimu.github.io/algorithm-playground/learning-tool.mjs?v=bayes-journey-v1')
})
