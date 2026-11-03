import test from 'node:test'
import assert from 'node:assert/strict'
import { clearPaperLessonProgressSafely } from '../shared/paperLessonProgress.ts'
const api = await import('./moeLessonAttempt.ts').catch(() => ({}))
const completed = () => ({ step: 5, guess: 0, revealed: true, concern: 5, touched: true, rule: 'tradeoff' })
const storage = () => { const values = new Map([['genai-paper-lesson-progress-v1', '{"switch-transformers":{"step":5,"completed":true}}'], ['genai-learning-progress-v1', '{"probability":1}']]); return { values, getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) } }

test('a snapshot retains the real original guess and concern5 result instead of restoring defaults', () => {
  assert.equal(typeof api.makeMoeAttempt, 'function')
  const a = api.makeMoeAttempt(completed())
  assert.equal(a.guess, 0)
  assert.equal(a.concern, 5)
  assert.equal(a.result.lambda, 5)
  assert.equal(a.result.gate, 'Go')
  assert.equal(a.result.dropRate, 0)
  assert.equal(a.result.p95Latency, 260)
  assert.equal(a.result.qualityHitRate, 2 / 3)
})
test('a new unfinished draft never replaces the last complete experiment', () => {
  assert.equal(typeof api.nextMoeNotebook, 'function')
  const a = api.makeMoeAttempt(completed())
  const n = api.nextMoeNotebook({ schemaVersion: 1 }, a)
  const draft = api.makeMoeAttempt({ step: 1, guess: null, revealed: false, concern: 0, touched: false, rule: null })
  const next = api.nextMoeNotebook(n, draft)
  assert.deepEqual(next.lastCompleted, a)
  assert.equal(next.draft.step, 1)
  assert.equal(next.draft.result.gate, 'No-Go')
})
test('saving and loading writes only the separate notebook and preserves legacy bytes', () => {
  assert.equal(typeof api.writeMoeNotebook, 'function')
  const s = storage(), original = [...s.values]
  const n = api.nextMoeNotebook({ schemaVersion: 1 }, api.makeMoeAttempt(completed()))
  const saved = api.writeMoeNotebook(n, null, s)
  assert.equal(saved.ok, true)
  const read = api.readMoeNotebook(s)
  assert.equal(read.kind, 'ready')
  assert.equal(read.notebook.lastCompleted.result.lambda, 5)
  for (const [key, value] of original) assert.equal(s.values.get(key), value)
})
test('invalid, unavailable and unknown-version notebooks are not silently repaired or overwritten', () => {
  assert.equal(typeof api.readMoeNotebook, 'function')
  const good = api.nextMoeNotebook({ schemaVersion: 1 }, api.makeMoeAttempt(completed()))
  const bads = ['{bad', 'x'.repeat(64001), JSON.stringify({ schemaVersion: 2 }), JSON.stringify({ ...good, lastCompleted: { ...good.lastCompleted, engineVersion: 'future' } }), JSON.stringify({ ...good, lastCompleted: { ...good.lastCompleted, result: { ...good.lastCompleted.result, lambda: 0 } } })]
  for (const raw of bads) {
    const s = storage(); s.values.set(api.MOE_NOTEBOOK_KEY, raw)
    assert.notEqual(api.readMoeNotebook(s).kind, 'ready')
    assert.equal(api.writeMoeNotebook(good, raw, s).ok, false)
    assert.equal(s.values.get(api.MOE_NOTEBOOK_KEY), raw)
  }
  assert.equal(api.readMoeNotebook({ getItem() { throw Error('blocked') } }).kind, 'unavailable')
})
test('a failed or stale write does not replace a saved experiment', () => {
  assert.equal(typeof api.writeMoeNotebook, 'function')
  const n = api.nextMoeNotebook({ schemaVersion: 1 }, api.makeMoeAttempt(completed()))
  const s = storage(); const saved = api.writeMoeNotebook(n, null, s)
  assert.equal(api.writeMoeNotebook(n, null, s).reason, 'changed')
  assert.equal(s.values.get(api.MOE_NOTEBOOK_KEY), saved.raw)
  assert.equal(api.writeMoeNotebook(n, saved.raw, { getItem: s.getItem, setItem() { throw Error('quota') } }).ok, false)
  assert.equal(s.values.get(api.MOE_NOTEBOOK_KEY), saved.raw)
})
test('malformed controls and impossible progress cannot become a completed snapshot', () => {
  assert.equal(typeof api.makeMoeAttempt, 'function')
  for (const patch of [{ concern: 11 }, { concern: NaN }, { concern: 4.5 }, { guess: null }, { guess: 9 }, { revealed: false }, { touched: false }, { rule: null }, { concern: 0 }]) assert.throws(() => api.makeMoeAttempt({ ...completed(), ...patch }))
})
test('browser saves hold one exclusive lock so a concurrent stale writer cannot replace newer bytes', async () => {
  assert.equal(typeof api.persistMoeNotebook, 'function')
  const s = storage(), first = api.nextMoeNotebook({ schemaVersion: 1 }, api.makeMoeAttempt(completed()))
  const second = api.nextMoeNotebook({ schemaVersion: 1 }, api.makeMoeAttempt({ ...completed(), guess: 2 }))
  let queue = Promise.resolve()
  const locks = { request(name, callback) { assert.equal(name, api.MOE_NOTEBOOK_KEY); const result = queue.then(callback); queue = result.catch(() => {}); return result } }
  const results = await Promise.all([api.persistMoeNotebook(first, null, s, locks), api.persistMoeNotebook(second, null, s, locks)])
  assert.equal(results[0].ok, true)
  assert.equal(results[1].reason, 'changed')
  assert.equal(api.readMoeNotebook(s).notebook.lastCompleted.guess, 0)
})
test('an unavailable browser lock does not fall back to an unprotected write', async () => {
  assert.equal(typeof api.persistMoeNotebook, 'function')
  const s = storage(), before = [...s.values]
  const n = api.nextMoeNotebook({ schemaVersion: 1 }, api.makeMoeAttempt(completed()))
  const result = await api.persistMoeNotebook(n, null, s, { request() { throw Error('blocked') } })
  assert.equal(result.ok, false)
  assert.deepEqual([...s.values], before)
})
test('an explicitly superseded queued save neither writes nor updates related progress', async () => {
  const s = storage(), before = [...s.values]
  const n = api.nextMoeNotebook({ schemaVersion: 1 }, api.makeMoeAttempt(completed()))
  const result = await api.persistMoeNotebook(n, null, s, { request: async (_, callback) => callback() }, () => false, () => assert.fail('superseded save must not sync progress'))
  assert.equal(result.reason, 'changed')
  assert.deepEqual([...s.values], before)
})
test('clearing invalidates a later queued null lease even if the first save failed', async () => {
  const values = new Map(), descriptors = new Map(['localStorage', 'navigator', 'window', 'CustomEvent'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]))
  let rejectFirst = true, queue = Promise.resolve()
  const s = { getItem: k => values.get(k) ?? null, removeItem: k => values.delete(k), setItem(k, v) { if (k === api.MOE_NOTEBOOK_KEY && rejectFirst) { rejectFirst = false; throw Error('quota once') } values.set(k, v) } }
  const locks = { request(_, callback) { const task = queue.then(callback); queue = task.catch(() => {}); return task } }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: s })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent() {} } })
  Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: class {} })
  try {
    const n = api.nextMoeNotebook({ schemaVersion: 1 }, api.freshMoeAttempt())
    const first = api.persistMoeNotebook(n, null, s, locks)
    const clear = clearPaperLessonProgressSafely()
    const later = first.then(() => api.persistMoeNotebook(n, null, s, locks))
    assert.equal((await first).ok, false)
    assert.equal(await clear, true)
    assert.equal((await later).reason, 'changed')
    const loaded = api.readMoeNotebook(s)
    assert.deepEqual(loaded.notebook, { schemaVersion: 1 })
    assert.ok(JSON.parse(loaded.raw).resetToken)
  } finally { for (const [k, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, k, descriptor); else delete globalThis[k] } }
})
