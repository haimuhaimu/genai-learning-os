import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { tsImport } from 'tsx/esm/api'
const api = await tsImport('./journeyResume.ts', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../tsconfig.app.json', import.meta.url)) })
const active = { active: true }, idle = { active: false }

test('explicit journey choice wins independently of progress or activity', () => {
  assert.deepEqual(api.resolveJourneyResume('bayes-learning', active, idle), { current: 'bayes-learning', needsChoice: false })
  assert.deepEqual(api.resolveJourneyResume('model-learning', idle, active), { current: 'model-learning', needsChoice: false })
})
test('legacy one-route records resume, while two active routes ask instead of guessing', () => {
  assert.deepEqual(api.resolveJourneyResume(null, active, idle), { current: 'model-learning', needsChoice: false })
  assert.deepEqual(api.resolveJourneyResume(null, idle, active), { current: 'bayes-learning', needsChoice: false })
  assert.deepEqual(api.resolveJourneyResume(null, active, active), { current: null, needsChoice: true })
  assert.deepEqual(api.resolveJourneyResume(null, idle, idle), { current: null, needsChoice: false })
})
test('only a small valid versioned preference is accepted', () => {
  for (const raw of [null, '', '{', '{"schemaVersion":2,"journeyId":"bayes-learning"}', '{"schemaVersion":1,"journeyId":"unknown"}', 'x'.repeat(1000)]) {
    assert.equal(api.readCurrentJourney({ getItem: () => raw }), null)
  }
  assert.equal(api.readCurrentJourney({ getItem: () => '{"schemaVersion":1,"journeyId":"bayes-learning"}' }), 'bayes-learning')
  assert.equal(api.readCurrentJourney({ getItem() { throw new Error('blocked') } }), null)
})
test('remembering navigation writes only its own key, never learning records', () => {
  const records = new Map([['genai-learning-progress-v1', '{"probability":1}'], ['genai-model-learning-journey-v1', 'original model bytes'], ['genai-bayes-learning-journey-v1', 'original Bayes bytes']])
  const original = [...records]
  assert.equal(api.rememberCurrentJourney('bayes-learning', { setItem: (key, value) => records.set(key, value) }), true)
  for (const [key, value] of original) assert.equal(records.get(key), value)
  assert.deepEqual(JSON.parse(records.get(api.CURRENT_JOURNEY_KEY)), { schemaVersion: 1, journeyId: 'bayes-learning' })
  assert.equal(api.rememberCurrentJourney('bayes-learning', { setItem() { throw new Error('blocked') } }), false)
})
test('only explicit journey sections map to a preference', () => {
  assert.equal(api.journeyForSection('journey'), 'model-learning')
  assert.equal(api.journeyForSection('bayes-journey'), 'bayes-learning')
  for (const section of [undefined, '', 'choose-journey', 'all', 'bayes']) assert.equal(api.journeyForSection(section), null)
})
