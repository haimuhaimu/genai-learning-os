import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const api = await import('./learningJourney.ts').catch(() => ({}))
const receipt = JSON.parse(readFileSync(new URL('./fixtures/playground-learning-run.json', import.meta.url), 'utf8'))
const text = JSON.stringify(receipt)
const initial = () => ({ schemaVersion: 1, active: false })
const requestId = 'journey-request-0123456789'
const envelope = () => ({ format: 'genai-learning-os/playground-handoff', schemaVersion: 1, journeyId: 'model-learning', requestId, receipt })
const storage = () => { const values = new Map(); return { values, getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) } }

test('summary retains real wrong guesses, one-step change and held-out result', () => {
  assert.equal(typeof api.summarizeLearningRun, 'function')
  const s = api.summarizeLearningRun(receipt)
  assert.equal(s.trainingBefore, 2)
  assert.equal(s.trainingAfter, 0)
  assert.equal(s.trainingSteps, 120)
  assert.equal(s.gradientSteps, 1)
  assert.equal(s.stepGuess, 'points')
  assert.equal(s.testGuess, 'all')
  assert.equal(s.testCorrect, 13)
  assert.equal(s.testTotal, 16)
  assert.equal(s.rate, .15)
  assert.equal(s.gradientBefore, .665626765614)
  assert.equal(s.gradientAfter, .647444924011)
  assert.equal(s.complete, true)
})

test('accepts only the fixed route/version and bounded safe JSON', () => {
  assert.equal(typeof api.parseJourneyImport, 'function')
  assert.equal(api.parseJourneyImport(text).experimentId, 'learning-route')
  for (const bad of ['', '{', 'x'.repeat(65537), JSON.stringify({ ...receipt, engineVersion: 'future-v2' }), JSON.stringify({ ...receipt, experimentId: 'pixel-decode' }), text.replace('"schemaVersion":1', '"schemaVersion":2'), '{"__proto__":{}}']) {
    assert.throws(() => api.parseJourneyImport(bad))
  }
  assert.throws(() => api.parseJourneyImport(JSON.stringify({ ...receipt, actions: Array(257).fill({ action: 'train' }) })))
})

test('a handoff must match this launch, manual receipt import is separate', () => {
  assert.equal(typeof api.parseJourneyImport, 'function')
  assert.equal(api.parseJourneyImport(JSON.stringify(envelope()), requestId).experimentId, 'learning-route')
  assert.throws(() => api.parseJourneyImport(JSON.stringify(envelope()), 'newer-request-0123456'))
  assert.throws(() => api.parseJourneyImport(JSON.stringify(envelope())))
  assert.throws(() => api.parseJourneyImport(JSON.stringify({ ...envelope(), journeyId: 'unknown' }), requestId))
  assert.equal(api.parseJourneyImport(text, 'newer-request-0123456').engineVersion, 'learning-route-v1')
})

test('fragment round-trips Unicode without putting the receipt in a server query', () => {
  assert.equal(typeof api.decodeJourneyHash, 'function')
  const payload = Buffer.from(JSON.stringify(envelope())).toString('base64url')
  assert.deepEqual(JSON.parse(api.decodeJourneyHash('#playground=' + payload)), envelope())
  assert.equal(api.decodeJourneyHash('#unrelated'), null)
  assert.throws(() => api.decodeJourneyHash('#playground=%%%'))
  assert.throws(() => api.decodeJourneyHash('#playground=' + 'a'.repeat(90001)))
})

test('launch only changes independent journey state and canonicalizes safe targets', () => {
  assert.equal(typeof api.startJourneyLaunch, 'function')
  const current = initial()
  const launched = api.startJourneyLaunch(current, 'http://127.0.0.1:3103/', 'http://127.0.0.1:3102/?page=foundation&node=x', requestId)
  const u = new URL(launched.url)
  assert.equal(u.pathname, '/learn.html')
  assert.equal(u.searchParams.get('genaiJourney'), 'model-learning')
  assert.equal(u.searchParams.get('genaiRequest'), requestId)
  assert.equal(u.searchParams.get('genaiReturn'), 'http://127.0.0.1:3102/?page=routes&section=journey')
  assert.deepEqual(current, initial())
  assert.equal(launched.state.pendingRequest, requestId)
  assert.equal(launched.state.active, true)
  for (const base of ['https://evil.example/', 'javascript:alert(1)', 'http://127.0.0.1:80/']) assert.throws(() => api.startJourneyLaunch(current, base, 'http://127.0.0.1:3102/', requestId))
  for (const target of ['https://evil.example/', 'https://haimuhaimu.github.io/other/', 'https://u:p@haimuhaimu.github.io/genai-learning-os/']) assert.throws(() => api.startJourneyLaunch(current, 'https://haimuhaimu.github.io/algorithm-playground/', target, requestId))
})

test('replay failures cannot produce a verified candidate, engine identity claims are not trusted', async () => {
  assert.equal(typeof api.verifyPlaygroundRecord, 'function')
  const result = await api.verifyPlaygroundRecord(text, value => ({ matches: true, authenticatesUser: false, receipt: value }))
  assert.equal(result.summary.testCorrect, 13)
  await assert.rejects(api.verifyPlaygroundRecord(text, () => { throw Error('tampered') }))
  await assert.rejects(api.verifyPlaygroundRecord(text, value => ({ matches: false, authenticatesUser: false, receipt: value })))
  await assert.rejects(api.verifyPlaygroundRecord(text, value => ({ matches: true, authenticatesUser: true, receipt: value })))
})

test('agent references and no declaration cannot count as personal practice', () => {
  assert.equal(typeof api.recordPersonalPractice, 'function')
  assert.throws(() => api.recordPersonalPractice(initial(), receipt, false))
  assert.throws(() => api.recordPersonalPractice(initial(), { ...receipt, producer: 'agent' }, true))
  assert.throws(() => api.recordPersonalPractice(initial(), { ...receipt, result: { ...receipt.result, workflowComplete: false } }, true))
  const saved = api.recordPersonalPractice(initial(), receipt, true)
  assert.equal(saved.practice.selfDeclared, true)
  assert.equal(api.deriveJourneyStatus({}, saved).complete, false, 'a receipt is not a viewed course or recap')
})

test('recap is tied to accepted record and wrong choices do not complete the path', () => {
  assert.equal(typeof api.saveJourneyReflection, 'function')
  const practice = api.recordPersonalPractice(initial(), receipt, true)
  const wrong = api.saveJourneyReflection(practice, { change: 'points', evaluation: 'practice' })
  assert.equal(api.deriveJourneyStatus({ 'gradient-descent': 1 }, wrong).complete, false)
  const good = api.saveJourneyReflection(wrong, { change: 'parameters', evaluation: 'unseen' })
  const status = api.deriveJourneyStatus({ 'gradient-descent': 1 }, good)
  assert.deepEqual(status.steps, [true, true, true])
  assert.equal(status.complete, true)
  assert.equal(status.mastery, 'not-assessed')
  assert.deepEqual(api.recordPersonalPractice(good, receipt, true), good, 'duplicate keeps recap')
  const another = { ...receipt, actions: [...receipt.actions, { action: 'back' }] }
  assert.equal(api.recordPersonalPractice(good, another, true).reflection, undefined, 'replacement cannot reuse an old recap')
})

test('storage uses only its own key and reports blocked writes without losing old data', () => {
  assert.equal(typeof api.writeJourney, 'function')
  const s = storage()
  s.setItem('genai-learning-progress-v1', '{"probability":4}')
  s.setItem('pixel-draft', 'private drawing')
  const next = api.recordPersonalPractice(initial(), receipt, true)
  assert.equal(api.writeJourney(next, s), true)
  assert.deepEqual(api.readJourney(s), next)
  assert.equal(s.getItem('genai-learning-progress-v1'), '{"probability":4}')
  assert.equal(s.getItem('pixel-draft'), 'private drawing')
  assert.equal(api.writeJourney(initial(), { setItem() { throw Error('quota') } }), false)
  assert.deepEqual(api.readJourney(s), next)
  assert.deepEqual(api.readJourney({ getItem() { return 'broken' } }), initial())
})

test('damaged saved evidence cannot become a completed learning path', () => {
  const saved = api.saveJourneyReflection(api.recordPersonalPractice(initial(), receipt, true), { change: 'parameters', evaluation: 'unseen' })
  for (const damage of [r => { r.result.evidence.test.test = null }, r => { r.result.evidence.guide.steps = -120 }, r => { r.result.evidence.test.test.correct = 16 }]) {
    const corrupt = structuredClone(saved); damage(corrupt.practice.receipt)
    const s = { getItem: () => JSON.stringify(corrupt) }
    const read = api.readJourney(s)
    assert.equal(api.deriveJourneyStatus({ 'gradient-descent': 1 }, read).complete, false)
    assert.equal(read.practice, undefined)
  }
})

test('a stalled verifier times out rather than keeping the retry control busy forever', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let release, outcome = 'pending'
  const result = api.verifyPlaygroundRecord(text, () => new Promise(resolve => { release = resolve }))
  result.then(() => { outcome = 'accepted' }, () => { outcome = 'rejected' })
  try {
    t.mock.timers.tick(12000)
    for (let i = 0; i < 8; i++) await Promise.resolve()
    assert.equal(outcome, 'rejected')
  } finally {
    release({ matches: true, authenticatesUser: false, receipt })
    await result.catch(() => {})
    t.mock.timers.reset()
  }
})
