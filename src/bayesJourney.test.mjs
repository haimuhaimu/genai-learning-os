import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const api = await import('./bayesJourney.ts').catch(() => ({}))
const receipt = JSON.parse(readFileSync(new URL('./fixtures/playground-bayes-run.json', import.meta.url), 'utf8'))
const initial = () => ({ schemaVersion: 1, active: false })
const requestId = 'bayes-request-0123456789'
const text = () => JSON.stringify(receipt)
const envelope = () => ({ format: 'genai-learning-os/playground-handoff', schemaVersion: 1, journeyId: 'bayes-learning', requestId, receipt })
const storage = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) } }

test('Bayes summary preserves wrong predictions, before/after evidence and corrected transfer attempts', () => {
  assert.equal(typeof api.summarizeBayesRun, 'function')
  const s = api.summarizeBayesRun(receipt)
  assert.equal(s.complete, true)
  assert.equal(s.producer, 'browser-session')
  assert.equal(s.guess, 'same')
  assert.equal(s.changeGuess, 'many')
  assert.deepEqual(s.attempts, ['never', 'evidence'])
  assert.equal(s.firstAttemptCorrect, false)
  assert.equal(s.actionCount, 6)
  assert.equal(s.baseline[0].mean, .571428571429)
  assert.equal(s.after[0].mean, .5)
  assert.equal(s.after[1].mean, .575757575758)
  assert.equal(s.transfer[1].mean, .0833333333333)
  const lower = receipt.result.evidence.baseline[0].belief.interval[0]
  s.baseline[0].interval[0] = 0
  assert.equal(receipt.result.evidence.baseline[0].belief.interval[0], lower)
})
test('a wrong explanation awaiting correction is not reported as unanswered', () => {
  const partial = structuredClone(receipt)
  partial.actions.pop(); partial.steps.pop()
  partial.result.stage = 'updated'; partial.result.workflowComplete = false
  partial.result.evidence.phase = 'updated'; partial.result.evidence.ending = null
  partial.result.evidence.attempts = ['never']
  const summary = api.summarizeBayesRun(partial)
  assert.equal(summary.complete, false)
  assert.deepEqual(summary.attempts, ['never'])
  assert.equal(summary.firstAttemptCorrect, false)
})

test('imports enforce Bayes version, safe bounded JSON and bounded journal', () => {
  assert.equal(typeof api.parseBayesImport, 'function')
  assert.equal(api.parseBayesImport(text()).experimentId, 'bayes-update')
  for (const bad of ['', '{', 'x'.repeat(65537), '{"__proto__":{}}', JSON.stringify({ ...receipt, engineVersion: 'bayes-update-v2' }), JSON.stringify({ ...receipt, experimentId: 'learning-route' }), JSON.stringify({ ...receipt, producer: 'unknown' }), JSON.stringify({ ...receipt, actions: Array(257).fill({ action: 'reveal' }) })]) assert.throws(() => api.parseBayesImport(bad))
})

test('Bayes handoff cannot consume model route or a stale launch envelope', () => {
  assert.equal(typeof api.parseBayesImport, 'function')
  assert.equal(api.parseBayesImport(JSON.stringify(envelope()), requestId).engineVersion, 'bayes-update-v1')
  assert.throws(() => api.parseBayesImport(JSON.stringify(envelope())))
  assert.throws(() => api.parseBayesImport(JSON.stringify(envelope()), 'newer-bayes-request-0000'))
  assert.throws(() => api.parseBayesImport(JSON.stringify({ ...envelope(), journeyId: 'model-learning' }), requestId))
  assert.equal(api.parseBayesImport(text(), 'newer-bayes-request-0000').experimentId, 'bayes-update')
})

test('launch opens only the Bayes lesson and returns to its independent route', () => {
  assert.equal(typeof api.startBayesLaunch, 'function')
  const state = initial()
  const launched = api.startBayesLaunch(state, 'http://127.0.0.1:3103/', 'http://127.0.0.1:3102/?page=routes', requestId)
  const url = new URL(launched.url)
  assert.equal(url.pathname, '/mining.html')
  assert.equal(url.hash, '#bayes-lesson')
  assert.equal(url.searchParams.get('genaiJourney'), 'bayes-learning')
  assert.equal(url.searchParams.get('genaiReturn'), 'http://127.0.0.1:3102/?page=routes&section=bayes-journey')
  assert.equal(launched.state.pendingRequest, requestId)
  assert.deepEqual(state, initial())
  for (const base of ['https://example.com/', 'javascript:alert(1)', 'http://127.0.0.1:80/', 'https://haimuhaimu.github.io/other/']) assert.throws(() => api.startBayesLaunch(state, base, 'http://127.0.0.1:3102/', requestId))
  for (const target of ['https://example.com/', 'https://haimuhaimu.github.io/other/', 'https://u:p@haimuhaimu.github.io/genai-learning-os/']) assert.throws(() => api.startBayesLaunch(state, 'https://haimuhaimu.github.io/algorithm-playground/', target, requestId))
})

test('fresh verification rejects mismatch, identity claims and a swapped route', async () => {
  assert.equal(typeof api.verifyBayesRecord, 'function')
  const result = await api.verifyBayesRecord(text(), r => ({ matches: true, authenticatesUser: false, receipt: r }))
  assert.equal(result.summary.after[0].mean, .5)
  for (const verify of [() => { throw Error('mismatch') }, r => ({ matches: false, authenticatesUser: false, receipt: r }), r => ({ matches: true, authenticatesUser: true, receipt: r }), r => ({ matches: true, authenticatesUser: false, receipt: { ...r, experimentId: 'learning-route' } })]) await assert.rejects(api.verifyBayesRecord(text(), verify))
})

test('only declared complete browser practice can be saved, never an AI reference', () => {
  assert.equal(typeof api.recordBayesPractice, 'function')
  assert.throws(() => api.recordBayesPractice(initial(), receipt, false))
  assert.throws(() => api.recordBayesPractice(initial(), { ...receipt, producer: 'agent' }, true))
  assert.throws(() => api.recordBayesPractice(initial(), { ...receipt, result: { ...receipt.result, workflowComplete: false } }, true))
  const s = api.recordBayesPractice(initial(), receipt, true)
  assert.equal(s.practice.selfDeclared, true)
  assert.deepEqual(api.deriveBayesStatus({}, s).steps, [false, true, false])
})

test('Bayes recap checks evidence versus world and uncertainty without claiming mastery', () => {
  assert.equal(typeof api.saveBayesReflection, 'function')
  assert.throws(() => api.saveBayesReflection(initial(), { update: 'evidence', certainty: 'uncertain' }))
  const practice = api.recordBayesPractice(initial(), receipt, true)
  const wrong = api.saveBayesReflection(practice, { update: 'planet', certainty: 'zero' })
  assert.equal(api.deriveBayesStatus({ probability: 1 }, wrong).complete, false)
  const good = api.saveBayesReflection(wrong, { update: 'evidence', certainty: 'uncertain' })
  assert.deepEqual(api.deriveBayesStatus({ probability: 1 }, good), { steps: [true, true, true], complete: true, mastery: 'not-assessed', next: -1 })
  assert.deepEqual(api.recordBayesPractice(good, receipt, true), good)
  const other = { ...receipt, actions: [...receipt.actions, { action: 'reveal' }] }
  assert.equal(api.recordBayesPractice(good, other, true).reflection, undefined)
})

test('Bayes storage is separate from model route, course progress and drafts; blocked writes preserve old value', () => {
  assert.equal(typeof api.readBayesJourney, 'function')
  const db = storage()
  db.setItem('genai-model-learning-journey-v1', 'MODEL-UNCHANGED')
  db.setItem('genai-learning-progress-v1', '{"probability":2}')
  db.setItem('pixel-draft', 'PRIVATE-DRAFT')
  const saved = api.recordBayesPractice(initial(), receipt, true)
  assert.equal(api.writeBayesJourney(saved, db), true)
  assert.deepEqual(api.readBayesJourney(db), saved)
  assert.equal(db.getItem('genai-model-learning-journey-v1'), 'MODEL-UNCHANGED')
  assert.equal(db.getItem('genai-learning-progress-v1'), '{"probability":2}')
  assert.equal(db.getItem('pixel-draft'), 'PRIVATE-DRAFT')
  assert.equal(api.writeBayesJourney(initial(), { setItem() { throw Error('quota') } }), false)
  assert.deepEqual(api.readBayesJourney(db), saved)
  assert.deepEqual(api.readBayesJourney({ getItem() { return '{' } }), initial())
})

test('damaged stored evidence and incomplete transfer cannot inflate Bayes completion', () => {
  const saved = api.saveBayesReflection(api.recordBayesPractice(initial(), receipt, true), { update: 'evidence', certainty: 'uncertain' })
  for (const damage of [r => { r.result.evidence.after[0].belief.mean = 0 }, r => { r.result.evidence.transfer = null }, r => { r.result.evidence.attempts = [] }]) {
    const corrupt = structuredClone(saved); damage(corrupt.practice.receipt)
    const read = api.readBayesJourney({ getItem: () => JSON.stringify(corrupt) })
    assert.equal(read.practice, undefined)
    assert.equal(api.deriveBayesStatus({ probability: 1 }, read).complete, false)
  }
})

test('a stalled Bayes verifier has a bounded wait and does not save evidence', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const pending = api.verifyBayesRecord(text(), () => new Promise(() => {}))
  const rejected = assert.rejects(pending, /超时/)
  try { t.mock.timers.tick(12000); await rejected } finally { t.mock.timers.reset() }
})
