import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const api = await import('./bayesCoach.ts').catch(() => ({}))
const receipt = JSON.parse(readFileSync(new URL('./fixtures/playground-bayes-run.json', import.meta.url), 'utf8'))
const runtime = () => ({ replay: r => ({ matches: true, authenticatesUser: false, receipt: structuredClone(r) }) })

test('Bayes starter explains the task and legal tool entry without exposing future results or personal data', async () => {
  assert.equal(typeof api.prepareBayesCoachPackage, 'function')
  const p = await api.prepareBayesCoachPackage({})
  assert.equal(p.format, 'genai-learning-os/bayes-coach-task')
  assert.equal(p.phase, 'before-practice')
  assert.equal(p.course.id, 'bayes-learning')
  assert.equal(p.course.stations.length, 3)
  assert.equal(p.record, null)
  assert.equal(p.learnerRecap, null)
  assert.equal(p.tool.id, 'bayes-update')
  assert.deepEqual(p.tool.initialRequest, { experimentId: 'bayes-update', actions: [] })
  assert.equal(p.tool.nextActionsFrom, 'result.availableActions')
  assert.equal(p.tool.browserURL, 'https://haimuhaimu.github.io/algorithm-playground/mining.html#bayes-lesson')
  assert.equal(p.tool.moduleURL, 'https://haimuhaimu.github.io/algorithm-playground/learning-tool.mjs?v=bayes-journey-v1')
  assert.equal(p.policy.mastery, 'not-assessed')
  assert.equal(p.policy.writesProgress, false)
  const text = JSON.stringify(p)
  for (const hidden of ['0.575757', '0.083333', 'answerKey', 'correctOption', 'savedAt', 'localStorage', 'PRIVATE']) assert.ok(!text.includes(hidden), hidden)
})

test('Bayes evidence includes original mistakes and real before/after evidence after fresh verification', async () => {
  assert.equal(typeof api.prepareBayesCoachPackage, 'function')
  let replays = 0
  const p = await api.prepareBayesCoachPackage({ receipt, reflection: { update: 'planet', certainty: 'zero' } }, { replay: r => { replays++; return runtime().replay(r) } })
  assert.equal(replays, 1)
  assert.equal(p.phase, 'after-practice')
  assert.equal(p.record.observed.guess, 'same')
  assert.equal(p.record.observed.changeGuess, 'many')
  assert.equal(p.record.observed.firstAttemptCorrect, false)
  assert.deepEqual(p.record.observed.attempts, ['never', 'evidence'])
  assert.equal(p.record.observed.after[0].mean, .5)
  assert.equal(p.record.observed.after[1].mean, .575757575758)
  assert.deepEqual(p.record.runRequest.actions, [
    { action: 'guess', value: 'same' }, { action: 'reveal' }, { action: 'change-guess', value: 'many' },
    { action: 'update' }, { action: 'answer', value: 'never' }, { action: 'answer', value: 'evidence' },
  ])
  assert.deepEqual(p.learnerRecap, { update: 'planet', certainty: 'zero' })
  assert.equal(p.record.localCheck.authenticatesUser, false)
  assert.equal(p.record.personalPractice, false)
  assert.equal(p.record.identity, 'not-authenticated')
})

test('recap alone does not reach into stored practice and invalid recap fields are not copied', async () => {
  const starter = await api.prepareBayesCoachPackage({ reflection: { update: 'evidence', certainty: 'uncertain' } })
  assert.equal(starter.record, null)
  assert.equal(starter.learnerRecap, null)
  const p = await api.prepareBayesCoachPackage({ receipt, reflection: { update: 'hidden', certainty: 'unknown' } }, runtime())
  assert.equal(p.learnerRecap, null)
})

test('failed, mismatched and identity-claiming replay cannot create verified Bayes evidence', async () => {
  await assert.rejects(api.prepareBayesCoachPackage({ receipt }))
  for (const replay of [() => { throw Error('mismatch') }, r => ({ matches: false, authenticatesUser: false, receipt: r }), r => ({ matches: true, authenticatesUser: true, receipt: r })]) await assert.rejects(api.prepareBayesCoachPackage({ receipt }, { replay }))
})

test('agent reference does not certify the learner and includes only allowlisted action data', async () => {
  const agent = { ...structuredClone(receipt), producer: 'agent', privateNote: 'PRIVATE-NOTE' }
  agent.actions[0].privateNote = 'PRIVATE-ACTION'
  const p = await api.prepareBayesCoachPackage({ receipt: agent, privateDraft: 'PRIVATE-DRAFT' }, runtime())
  assert.equal(p.record.producer, 'agent')
  assert.equal(p.record.personalPractice, false)
  assert.equal(p.policy.writesProgress, false)
  assert.equal(p.policy.mastery, 'not-assessed')
  const text = JSON.stringify(p)
  for (const secret of ['PRIVATE-', 'privateNote', 'privateDraft', 'savedAt', '/Users/', '127.0.0.1', 'localhost']) assert.ok(!text.includes(secret), secret)
})

test('malformed or unsupported action projection rejects rather than hiding an unplayable operation', async () => {
  for (const action of [{ action: 'guess', value: 'secret' }, { action: 'reset', value: 1 }, { action: 'upload', value: 'private' }]) {
    const changed = { ...structuredClone(receipt), actions: [action] }
    await assert.rejects(api.prepareBayesCoachPackage({ receipt: changed }, runtime()))
  }
})

test('Bayes copy text is explicit about human choice, no connected service and no mastery certification', async () => {
  const p = await api.prepareBayesCoachPackage({})
  const prompt = api.buildBayesCoachPrompt(p)
  assert.match(prompt, /一次只问一个/)
  assert.match(prompt, /没有接通/)
  assert.match(prompt, /尚未揭晓/)
  assert.match(prompt, /不得.*掌握/)
  assert.equal(JSON.parse(prompt.slice(prompt.indexOf('{'))).format, 'genai-learning-os/bayes-coach-task')
})

test('Bayes sharing snapshots caller record and recap before asynchronous verification', async () => {
  let release
  const original = structuredClone(receipt)
  const input = { receipt: original, reflection: { update: 'planet', certainty: 'zero' } }
  const result = api.prepareBayesCoachPackage(input, { replay: r => new Promise(resolve => { release = () => resolve({ matches: true, authenticatesUser: false, receipt: r }) }) })
  original.result.evidence.guess = 'many'
  input.reflection.update = 'evidence'
  release()
  const p = await result
  assert.equal(p.record.observed.guess, 'same')
  assert.equal(p.learnerRecap.update, 'planet')
  p.record.observed.after[0].interval[0] = 0
  assert.notEqual(original.result.evidence.after[0].belief.interval[0], 0)
})

test('Bayes evidence generation bounds a stalled replay instead of silently claiming verification', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const result = api.prepareBayesCoachPackage({ receipt }, { replay: () => new Promise(() => {}) })
  const rejected = assert.rejects(result, /超时/)
  try { t.mock.timers.tick(12000); await rejected } finally { t.mock.timers.reset() }
})
