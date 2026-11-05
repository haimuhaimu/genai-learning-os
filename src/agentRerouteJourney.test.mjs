import assert from 'node:assert/strict'
import test from 'node:test'
import { AGENT_JOURNEY_KEY } from './agentJourney.ts'
import { playgroundReplayURL } from './playgroundReplay.ts'

const api = await import('./agentRerouteJourney.ts').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('/agentRerouteJourney.ts')) return {}
  throw error
})

const request = 'reroute-request-0123456789'
const newer = 'reroute-request-9876543210'
const options = { expectedRequest: request, requireHandoff: true }
const empty = () => ({ schemaVersion: 1 })
const json = JSON.stringify
const oldReceipt = { orderId: 'SUP-07', station: '07' }
const newReceipt = { orderId: 'SUP-08', station: '08' }
const fixture = ({ last = 'accept-old', producer = 'browser-session' } = {}) => {
  const steps = [
    { action: 'advance', phase: 'partial', event: 'correction-start' },
    { action: 'advance', phase: 'decision', event: 'correction-confirmed' },
    { action: 'reroute', phase: 'await-old', event: 'reroute-accepted' },
    { action: 'advance', phase: 'review', event: 'old-receipt' },
  ]
  const finals = { 'accept-old': ['old-receipt-misattributed', 'misattributed'], 'verify-new': ['new-receipt-verified', 'verified'], stop: ['stopped-unverified', 'unverified'] }
  if (last) steps.push({ action: last, phase: 'done', event: finals[last][0] })
  return {
    format: 'algorithm-playground/learning-run', schemaVersion: 1,
    experimentId: 'agent-reroute', engineVersion: 'agent-reroute-v1', numericFormat: 'integer-events', producer,
    fixture: { id: 'reroute-07-to-08-v1', from: '07', to: '08' },
    actions: steps.map(({ action }) => ({ action })), steps,
    result: { stage: last ? 'done' : 'review', workflowComplete: Boolean(last), mastery: 'not-assessed',
      evidence: { activeTarget: '08', dispatched08: true, oldReceipt, newReceipt: last === 'verify-new' ? newReceipt : null, outcome: last ? finals[last][1] : 'in-progress' },
      availableActions: last ? [] : ['accept-old', 'stop', 'verify-new'].map(action => ({ action })),
    },
  }
}
const envelope = (receipt = fixture()) => ({ format: 'genai-learning-os/playground-handoff', schemaVersion: 1, journeyId: 'agent-reroute', requestId: request, receipt })
const verifiedByEngine = receipt => ({ matches: true, authenticatesUser: false, receipt })

test('level two launch names the exact replay and return routes, replacing only its own request', () => {
  assert.equal(typeof api.startRerouteLaunch, 'function')
  const state = { schemaVersion: 1, pendingRequest: request }
  const next = api.startRerouteLaunch(state, 'http://127.0.0.1:3103/', 'http://127.0.0.1:3102/?page=routes&section=agent-journey#ignored', newer)
  const url = new URL(next.url)
  assert.equal(url.pathname + url.hash, '/agent-reroute.html#mission')
  assert.equal(url.searchParams.get('genaiJourney'), 'agent-reroute')
  assert.equal(url.searchParams.get('genaiRequest'), newer)
  assert.equal(url.searchParams.get('genaiReturn'), 'http://127.0.0.1:3102/?page=routes&section=agent-reroute-journey')
  assert.equal(next.state.pendingRequest, newer)
  assert.equal(state.pendingRequest, request)
  assert.throws(() => api.startRerouteLaunch(state, 'https://other.example/', 'http://127.0.0.1:3102/', newer))
  assert.equal(playgroundReplayURL('agent-reroute', 'http://127.0.0.1:3103/'), 'http://127.0.0.1:3103/learning-tool.mjs?v=agent-reroute-v1')
})

test('level two import rejects wrong experiment, stale or foreign handoff, unsafe JSON and long action lists', () => {
  assert.equal(typeof api.parseRerouteImport, 'function')
  assert.equal(api.parseRerouteImport(json(envelope()), options).experimentId, 'agent-reroute')
  assert.equal(api.parseRerouteImport(json(fixture())).experimentId, 'agent-reroute')
  assert.throws(() => api.parseRerouteImport(json(envelope()), { ...options, expectedRequest: newer }), /本轮/)
  assert.throws(() => api.parseRerouteImport(json({ ...envelope(), journeyId: 'agent-learning' }), options), /不属于/)
  assert.throws(() => api.parseRerouteImport(json(fixture()), options), /返程/)
  for (const invalid of [
    json({ ...fixture(), experimentId: 'agent-tool-loop', engineVersion: 'agent-tool-loop-v1' }),
    json({ ...fixture(), actions: Array(9).fill({ action: 'advance' }) }),
    json({ ...fixture(), actions: [{ action: 'advance', station: '08' }] }),
    '{"__proto__":{}}', '停'.repeat(21846),
  ]) assert.throws(() => api.parseRerouteImport(invalid))
})

test('level two evidence uses recomputed chronology and keeps the old order separate from verification', async () => {
  assert.equal(typeof api.verifyRerouteRecord, 'function')
  const record = await api.verifyRerouteRecord(json(fixture()), verifiedByEngine)
  assert.equal(record.summary.outcome, 'misattributed')
  assert.equal(record.summary.activeTarget, '08')
  assert.deepEqual(record.summary.oldReceipt, { orderId: 'SUP-07', station: '07' })
  assert.equal(record.summary.newReceipt, null)
  assert.deepEqual(record.summary.steps.map(step => step.event), ['correction-start', 'correction-confirmed', 'reroute-accepted', 'old-receipt', 'old-receipt-misattributed'])
  const good = await api.verifyRerouteRecord(json(fixture({ last: 'verify-new' })), verifiedByEngine)
  assert.equal(good.summary.outcome, 'verified')
  assert.deepEqual(good.summary.newReceipt, { orderId: 'SUP-08', station: '08' })
  const stopped = await api.verifyRerouteRecord(json(fixture({ last: 'stop' })), verifiedByEngine)
  assert.equal(stopped.summary.outcome, 'unverified')
  await assert.rejects(api.verifyRerouteRecord(json(fixture()), receipt => ({ ...verifiedByEngine(receipt), matches: false })), /重放/)
  await assert.rejects(api.verifyRerouteRecord(json(fixture()), () => verifiedByEngine(fixture({ last: 'verify-new' }))), /重放/)
  await assert.rejects(api.verifyRerouteRecord(json(fixture()), receipt => ({ ...verifiedByEngine(receipt), authenticatesUser: true })), /重放/)
})

test('only a checked personal ending may be explicitly saved; a return invalidated after preview is refused', async () => {
  assert.equal(typeof api.recordReroutePractice, 'function')
  const checked = await api.verifyRerouteRecord(json(envelope()), verifiedByEngine, options)
  const state = { schemaVersion: 1, pendingRequest: request }
  assert.throws(() => api.recordReroutePractice(state, fixture(), true), /核对/)
  assert.throws(() => api.recordReroutePractice(state, checked, false), /亲手/)
  assert.throws(() => api.recordReroutePractice({ ...state, pendingRequest: newer }, checked, true), /本轮/)
  for (const receipt of [fixture({ last: null }), fixture({ producer: 'agent' })]) {
    const preview = await api.verifyRerouteRecord(json(receipt), verifiedByEngine)
    assert.throws(() => api.recordReroutePractice(state, preview, true), /亲手/)
  }
  assert.equal(state.practice, undefined)
  const saved = api.recordReroutePractice(state, checked, true)
  assert.equal(saved.practice.receipt.result.evidence.outcome, 'misattributed')
})

test('second-level persistence preserves first-level bytes and requires the latest confirmed order in reflection', async () => {
  assert.equal(typeof api.saveRerouteReflection, 'function')
  const db = new Map([[AGENT_JOURNEY_KEY, ' { "schemaVersion": 1, "reflection": "signed" } ']])
  const storage = { getItem: key => db.get(key) ?? null, setItem: (key, value) => db.set(key, value) }
  const prior = db.get(AGENT_JOURNEY_KEY)
  const checked = await api.verifyRerouteRecord(json(fixture()), verifiedByEngine)
  assert.throws(() => api.saveRerouteReflection(empty(), 'SUP-08'))
  const practiced = api.recordReroutePractice(empty(), checked, true)
  const wrong = api.saveRerouteReflection(practiced, 'SUP-07')
  assert.deepEqual(api.deriveRerouteStatus(wrong), { practiced: true, reflected: false, complete: false, mastery: 'not-assessed' })
  const correct = api.saveRerouteReflection(wrong, 'SUP-08')
  assert.deepEqual(api.deriveRerouteStatus(correct), { practiced: true, reflected: true, complete: true, mastery: 'not-assessed' })
  assert.equal(api.writeRerouteJourney(correct, storage), true)
  assert.deepEqual(api.readRerouteJourney(storage), correct)
  assert.equal(db.get(AGENT_JOURNEY_KEY), prior)
  const corrupt = structuredClone(correct)
  corrupt.practice.receipt.result.evidence.outcome = 'verified'
  assert.deepEqual(api.readRerouteJourney({ getItem: () => json(corrupt) }), empty())
})
