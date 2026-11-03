import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const api = await import('./modelCoach.ts').catch(() => ({}))
const receipt = JSON.parse(readFileSync(new URL('./fixtures/playground-learning-run.json', import.meta.url), 'utf8'))
const trial = { ordinal: 1, rate: .15, guess: 'points', lossBefore: .665626765614, lossAfter: .647444924011, weightsBefore: [1, -1, 0], weightsAfter: [1.03753022382, -.963293324686, -2.77555756156e-18] }
const runtime = () => ({ replay: value => ({ matches: true, authenticatesUser: false, receipt: structuredClone(value) }), inspect: () => [structuredClone(trial)] })

test('starter is a useful AI-readable task with no learner record, hidden results or answer key', async () => {
  assert.equal(typeof api.prepareModelCoachPackage, 'function')
  const p = await api.prepareModelCoachPackage({})
  assert.equal(p.format, 'genai-learning-os/model-coach-task')
  assert.equal(p.schemaVersion, 1)
  assert.equal(p.phase, 'before-practice')
  assert.equal(p.course.id, 'model-learning')
  assert.equal(p.course.stations.length, 3)
  assert.equal(p.course.stations[1].id, 'gradient')
  assert.equal(p.record, null)
  assert.equal(p.learnerRecap, null)
  assert.equal(p.tool.id, 'learning-route')
  assert.deepEqual(p.tool.operations, ['list', 'describe', 'run', 'replay'])
  assert.deepEqual(p.tool.initialRequest, { experimentId: 'learning-route', actions: [] })
  assert.equal(p.tool.nextActionsFrom, 'result.availableActions')
  assert.equal(p.tool.trialModuleURL, 'https://haimuhaimu.github.io/algorithm-playground/learning-route-trials.mjs')
  assert.equal(p.course.checkpoints[0].options.points, '例子的位置改变')
  assert.equal(p.course.checkpoints[1].options.practice, '仅凭练习成绩下结论')
  assert.equal(p.policy.mastery, 'not-assessed')
  const text = JSON.stringify(p)
  for (const hidden of ['.647444', '13/16', 'answerKey', 'correctOption', 'playground-learning-run', 'savedAt', 'localStorage']) assert.ok(!text.includes(hidden), hidden)
})

test('evidence package includes real wrong predictions and chronological trials only after fresh verification', async () => {
  assert.equal(typeof api.prepareModelCoachPackage, 'function')
  const p = await api.prepareModelCoachPackage({ receipt, reflection: { change: 'points', evaluation: 'practice' } }, runtime())
  assert.equal(p.phase, 'after-practice')
  assert.equal(p.record.observed.testCorrect, 13)
  assert.equal(p.record.observed.testTotal, 16)
  assert.equal(p.record.observed.stepGuess, 'points')
  assert.equal(p.record.observed.testGuess, 'all')
  assert.equal(p.record.trials[0].lossBefore, .665626765614)
  assert.equal(p.record.trials[0].lossAfter, .647444924011)
  assert.equal(p.record.localCheck.matches, true)
  assert.equal(p.record.localCheck.authenticatesUser, false)
  assert.equal(p.policy.writesProgress, false)
  assert.equal(p.policy.mastery, 'not-assessed')
  assert.deepEqual(p.learnerRecap, { change: 'points', evaluation: 'practice' })
  assert.deepEqual(p.record.runRequest.actions[5], { action: 'guess', value: 'points' })
  p.record.trials[0].weightsBefore[0] = 999
  assert.equal(receipt.fixture.initialWeights[0], 1, 'exports must not mutate a saved record')
})

test('a learner must explicitly supply the record; recap alone cannot pull saved data into a starter', async () => {
  const p = await api.prepareModelCoachPackage({ reflection: { change: 'parameters', evaluation: 'unseen' } })
  assert.equal(p.record, null)
  assert.equal(p.learnerRecap, null)
  assert.equal(p.phase, 'before-practice')
})

test('failed, tampered or identity-claiming replays cannot produce verified coach evidence', async () => {
  for (const replay of [() => { throw Error('mismatch') }, value => ({ matches: false, authenticatesUser: false, receipt: value }), value => ({ matches: true, authenticatesUser: true, receipt: value })]) {
    await assert.rejects(api.prepareModelCoachPackage({ receipt }, { ...runtime(), replay }))
  }
  await assert.rejects(api.prepareModelCoachPackage({ receipt }))
})

test('inconsistent inspector evidence cannot replace the actual final gradient observation', async () => {
  for (const trials of [[], [{ ...trial, lossAfter: 0 }], [{ ...trial, ordinal: 2 }], [{ ...trial, rate: Infinity }], [{ ...trial, weightsBefore: [1, -1] }], [{ ...trial, weightsBefore: [2, -1, 0] }]]) {
    await assert.rejects(api.prepareModelCoachPackage({ receipt }, { ...runtime(), inspect: () => trials }))
  }
})

test('agent evidence is explicitly reference-only and cannot certify a learner', async () => {
  const agent = { ...structuredClone(receipt), producer: 'agent' }
  const p = await api.prepareModelCoachPackage({ receipt: agent }, runtime())
  assert.equal(p.record.producer, 'agent')
  assert.equal(p.record.personalPractice, false)
  assert.equal(p.record.identity, 'not-authenticated')
  assert.equal(p.policy.writesProgress, false)
  assert.equal(p.policy.mastery, 'not-assessed')
})

test('record projection does not copy private extensions, local URLs, storage or caller objects', async () => {
  const input = { ...structuredClone(receipt), privateNote: 'PRIVATE-NOTE', savedAt: 'PRIVATE-TIME' }
  const r = runtime()
  r.replay = () => ({ matches: true, authenticatesUser: false, receipt: structuredClone(receipt) })
  const p = await api.prepareModelCoachPackage({ receipt: input, privateDraft: 'PRIVATE-DRAFT' }, r)
  const text = JSON.stringify(p)
  for (const value of ['PRIVATE-', '/Users/', '127.0.0.1', 'localhost', 'privateNote', 'savedAt']) assert.ok(!text.includes(value), value)
  assert.equal(p.record.runRequest.actions.length, 13)
})

test('copy prompt carries structured task context and disclaims live AI, authentication and mastery', async () => {
  const p = await api.prepareModelCoachPackage({})
  assert.equal(typeof api.buildCoachPrompt, 'function')
  const prompt = api.buildCoachPrompt(p)
  assert.match(prompt, /一次只问一个/)
  assert.match(prompt, /没有接通/)
  assert.match(prompt, /不得.*掌握/)
  assert.match(prompt, /尚未揭晓/)
  const parsed = JSON.parse(prompt.slice(prompt.indexOf('{')))
  assert.equal(parsed.format, 'genai-learning-os/model-coach-task')
})

test('record and recap are snapshotted before asynchronous replay, not read again after sharing changes', async () => {
  let release
  const original = structuredClone(receipt)
  const input = { receipt: original, reflection: { change: 'points', evaluation: 'practice' } }
  const r = { ...runtime(), replay: value => new Promise(resolve => { release = () => resolve({ matches: true, authenticatesUser: false, receipt: value }) }) }
  const result = api.prepareModelCoachPackage(input, r)
  original.result.evidence.test.test.correct = 16
  input.reflection.change = 'parameters'
  release()
  const p = await result
  assert.equal(p.record.observed.testCorrect, 13)
  assert.equal(p.learnerRecap.change, 'points')
})

test('an inspector that never finishes is bounded and cannot silently produce an evidence package', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const pending = api.prepareModelCoachPackage({ receipt }, { ...runtime(), inspect: () => new Promise(() => {}) })
  const rejected = assert.rejects(pending, /超时/)
  try { t.mock.timers.tick(12000); await rejected } finally { t.mock.timers.reset() }
})
