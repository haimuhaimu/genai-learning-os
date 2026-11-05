import assert from 'node:assert/strict'
import test from 'node:test'
import { AGENT_JOURNEY_KEY, readAgentHandoff } from './agentJourney.ts'
import { REROUTE_JOURNEY_KEY } from './agentRerouteJourney.ts'
import { playgroundReplayURL } from './playgroundReplay.ts'

const api = await import('./agentFramesJourney.ts').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('/agentFramesJourney.ts')) return {}
  throw error
})
const request = 'frames-request-0123456789', newer = 'frames-request-9876543210'
const state = { schemaVersion: 1, pendingRequest: request }
const options = { expectedRequest: request, requireHandoff: true }
const json = JSON.stringify
const round = (middle, signFrame, conclusion) => ({ frameIds: [0, middle, 8], signFrame, conclusion })
const fixed = round(4, null, 'insufficient-evidence')
const done = (manualPick = 5, producer = 'browser-session') => {
  const steps = [
    ...Array.from({ length: 8 }, (_, i) => ({ action: 'advance', phase: i === 7 ? 'baseline-done' : 'baseline', frame: i + 1 })),
    { action: 'start-manual', phase: 'manual', frame: 0 },
    ...Array.from({ length: 8 }, (_, i) => {
      const frame = i + 1
      const arrived = { action: 'advance', phase: frame === 8 ? 'done' : 'manual', frame }
      return frame === manualPick ? [arrived, { action: 'pin', phase: 'manual', frame }] : [arrived]
    }).flat(),
  ]
  return { format: 'algorithm-playground/learning-run', schemaVersion: 1, experimentId: 'agent-frames', engineVersion: 'agent-frames-v1', numericFormat: 'integer-events', producer,
    fixture: { id: 'station-08-stream-v1', station: '08', frameCount: 9, budget: 3, fixedFrames: [0, 4, 8] },
    actions: steps.map(({ action }) => ({ action })), steps,
    result: { stage: 'done', workflowComplete: true, mastery: 'not-assessed', availableActions: [], evidence: { frame: 8, manualPick, fixed,
      manual: manualPick === 5 ? round(5, 5, 'clear-to-unload') : round(manualPick, null, 'insufficient-evidence'),
    } }, boundaries: {}, genai: {},
  }
}
const envelope = (receipt = done()) => ({ format: 'genai-learning-os/playground-handoff', schemaVersion: 1, journeyId: 'agent-frames', requestId: request, receipt })
// Stub only the network module's response; all local parsing and state transitions are real.
const replayed = receipt => ({ matches: true, authenticatesUser: false, receipt })

test('launch and replay use the third-level routes without accepting unrelated origins', () => {
  assert.equal(typeof api.startFramesLaunch, 'function')
  const launch = api.startFramesLaunch(state, 'http://127.0.0.1:3157/', 'http://127.0.0.1:3156/?page=routes#ignored', newer)
  const url = new URL(launch.url)
  assert.equal(url.pathname + url.hash, '/agent-frames.html#mission')
  assert.equal(url.searchParams.get('genaiRequest'), newer)
  assert.equal(url.searchParams.get('genaiJourney'), 'agent-frames')
  assert.equal(url.searchParams.get('genaiReturn'), 'http://127.0.0.1:3156/?page=routes&section=agent-frames-journey')
  assert.equal(launch.state.pendingRequest, newer)
  assert.equal(state.pendingRequest, request)
  assert.throws(() => api.startFramesLaunch(state, 'https://other.example/', 'http://127.0.0.1:3156/', newer))
  assert.equal(playgroundReplayURL('agent-frames', 'http://127.0.0.1:3157/'), 'http://127.0.0.1:3157/learning-tool.mjs?v=agent-frames-v1')
})

test('refresh can reread a bound fragment; stale requests, foreign receipts and oversized actions cannot reach replay', () => {
  assert.equal(typeof api.parseFramesImport, 'function')
  const hash = '#playground=' + Buffer.from(json(envelope())).toString('base64url')
  const previous = globalThis.window
  try {
    globalThis.window = { location: { hash } }
    assert.equal(readAgentHandoff(api.parseFramesImport, request).text, json(envelope()))
    assert.equal(readAgentHandoff(api.parseFramesImport, request).text, json(envelope()))
    assert.match(readAgentHandoff(api.parseFramesImport, newer).error, /本轮/)
    assert.equal(globalThis.window.location.hash, hash)
  } finally { if (previous) globalThis.window = previous; else delete globalThis.window }
  assert.equal(api.parseFramesImport(json(done())).experimentId, 'agent-frames')
  assert.throws(() => api.parseFramesImport(json(done()), options), /返程/)
  assert.throws(() => api.parseFramesImport(json({ ...envelope(), journeyId: 'agent-reroute' }), options), /不属于/)
  for (const invalid of [
    json({ ...done(), experimentId: 'agent-reroute' }), json({ ...done(), actions: Array(19).fill({ action: 'advance' }) }),
    json({ ...done(), actions: [{ action: 'pin', frame: 5 }] }), '{"__proto__":{}}', '帧'.repeat(21846),
  ]) assert.throws(() => api.parseFramesImport(invalid))
})

test('a missed sign is not a denial, while pinning frame 5 yields new evidence at 5 seconds', async () => {
  assert.equal(typeof api.verifyFramesRecord, 'function')
  const miss = await api.verifyFramesRecord(json(done(4)), replayed)
  assert.deepEqual(miss.summary.fixed, { frameIds: [0, 4, 8], signFrame: null, conclusion: 'insufficient-evidence' })
  assert.deepEqual(miss.summary.manual, miss.summary.fixed)
  const hit = await api.verifyFramesRecord(json(done(5)), replayed)
  assert.deepEqual(hit.summary.manual, { frameIds: [0, 5, 8], signFrame: 5, conclusion: 'clear-to-unload' })
  const forged = done(4)
  forged.result.evidence.manual = round(4, 4, 'clear-to-unload')
  await assert.rejects(api.verifyFramesRecord(json(forged), replayed), /证据/)
  await assert.rejects(api.verifyFramesRecord(json(done(4)), () => replayed(done(5))), /重放/)
  await assert.rejects(api.verifyFramesRecord(json(done()), receipt => ({ ...replayed(receipt), authenticatesUser: true })), /重放/)
})

test('only explicit confirmation of a checked personal run allows save, including a miss', async () => {
  assert.equal(typeof api.recordFramesPractice, 'function')
  const checked = await api.verifyFramesRecord(json(envelope(done(4))), replayed, options)
  assert.throws(() => api.recordFramesPractice(state, checked, false), /亲手/)
  assert.throws(() => api.recordFramesPractice({ ...state, pendingRequest: newer }, checked, true), /本轮/)
  assert.throws(() => api.recordFramesPractice(state, { summary: checked.summary }, true), /核对/)
  const agent = await api.verifyFramesRecord(json(done(5, 'agent')), replayed)
  assert.throws(() => api.recordFramesPractice(state, agent, true), /亲手/)
  assert.equal(state.practice, undefined)
  const saved = api.recordFramesPractice(state, checked, true)
  assert.equal(saved.practice.receipt.result.evidence.manual.conclusion, 'insufficient-evidence')
  assert.equal(api.writeFramesJourney(saved, { setItem() { throw Error('Unavailable') } }), false)
  assert.deepEqual(api.recordFramesPractice(state, checked, true).practice.receipt, saved.practice.receipt)
})

test('transfer answer is explicit, wrong and correct answers do not claim mastery, and only the third-level key changes', async () => {
  assert.equal(typeof api.saveFramesReflection, 'function')
  const previous = [[AGENT_JOURNEY_KEY, ' level one '], [REROUTE_JOURNEY_KEY, ' level two '], ['genai-learning-progress-v1', '{"probability":2}']]
  const data = new Map(previous)
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
  assert.throws(() => api.saveFramesReflection(state, 'request-clear-frame'))
  const checked = await api.verifyFramesRecord(json(done()), replayed)
  const practiced = api.recordFramesPractice(state, checked, true)
  const wrong = api.saveFramesReflection(practiced, 'treat-as-denial')
  assert.deepEqual(api.deriveFramesStatus(wrong), { practiced: true, reflected: false, complete: false, mastery: 'not-assessed' })
  const correct = api.saveFramesReflection(wrong, 'request-clear-frame')
  assert.deepEqual(api.deriveFramesStatus(correct), { practiced: true, reflected: true, complete: true, mastery: 'not-assessed' })
  assert.equal(api.writeFramesJourney(correct, storage), true)
  assert.deepEqual(api.readFramesJourney(storage), correct)
  assert.deepEqual([...data].slice(0, 3), previous)
  assert.deepEqual([...data.keys()].slice(3), ['genai-agent-frames-journey-v1'])
})
