import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanPaperLessonProgress, clearPaperLessonProgress, clearPaperLessonProgressSafely, getPaperLessonCta, getPaperLessonHubCta, getPaperLessonSummary, lessonStepToLearningStage, readPaperLessonProgress, savePaperLessonStep } from './paperLessonProgress.ts'
import { applyFeedbackNudge } from '../../../feedback/nudgePolicy.ts'

function installStorage(initial) {
  const values = new Map(initial === undefined ? [] : [['genai-paper-lesson-progress-v1', initial]])
  const events = []
  const originalStorage = globalThis.localStorage
  const originalWindow = globalThis.window
  const originalCustomEvent = globalThis.CustomEvent
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: (event) => events.push(event) } })
  Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail } } })
  return { values, events, restore() {
    if (originalStorage === undefined) delete globalThis.localStorage; else Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalStorage })
    if (originalWindow === undefined) delete globalThis.window; else Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
    if (originalCustomEvent === undefined) delete globalThis.CustomEvent; else Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: originalCustomEvent })
  } }
}

test('损坏 JSON 与非法条目会清洗降级', () => {
  let mocks = installStorage('{bad')
  try { assert.deepEqual(readPaperLessonProgress(), {}) } finally { mocks.restore() }
  assert.deepEqual({ ...cleanPaperLessonProgress({ 'good-paper': { step: 3, completed: false }, Bad_ID: { step: 2 }, broken: { step: 9 }, list: [] }) }, { 'good-paper': { step: 3, completed: false } })
})

test('explicit case-progress clearing also removes MoE experiments but preserves unrelated records', () => {
  const mocks = installStorage('{"switch-transformers":{"step":5,"completed":true}}')
  mocks.values.set('genai-moe-experiment-notebook-v1', '{"schemaVersion":1}')
  mocks.values.set('genai-model-learning-journey-v1', 'keep me')
  try {
    assert.equal(clearPaperLessonProgress(), true)
    assert.equal(mocks.values.has('genai-paper-lesson-progress-v1'), false)
    const reset = JSON.parse(mocks.values.get('genai-moe-experiment-notebook-v1'))
    assert.equal(reset.schemaVersion, 1)
    assert.equal(typeof reset.resetToken, 'string')
    assert.equal(reset.lastCompleted, undefined)
    assert.equal(reset.draft, undefined)
    assert.equal(mocks.values.get('genai-model-learning-journey-v1'), 'keep me')
  } finally { mocks.restore() }
})

test('safe clearing waits for the shared lock and groups other progress deletion inside it', async () => {
  const mocks = installStorage('{"switch-transformers":{"step":5,"completed":true}}')
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  mocks.values.set('genai-moe-experiment-notebook-v1', '{"schemaVersion":1}')
  let release, otherClears = 0
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request(name, action) { assert.equal(name, 'genai-moe-experiment-notebook-v1'); return new Promise(resolve => { release = () => resolve(action()) }) } } } })
  try {
    const pending = clearPaperLessonProgressSafely(() => { otherClears++; return true })
    assert.equal(otherClears, 0)
    assert.equal(mocks.values.has('genai-moe-experiment-notebook-v1'), true)
    release()
    assert.equal(await pending, true)
    assert.equal(otherClears, 1)
    assert.equal(JSON.parse(mocks.values.get('genai-moe-experiment-notebook-v1')).lastCompleted, undefined)
  } finally { if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else delete globalThis.navigator; mocks.restore() }
})

test('a blocked clear lock leaves both progress and the experiment untouched', async () => {
  const mocks = installStorage('{"switch-transformers":{"step":5,"completed":true}}')
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  mocks.values.set('genai-moe-experiment-notebook-v1', '{"schemaVersion":1}')
  const before = [...mocks.values]
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request() { throw Error('blocked') } } } })
  try {
    assert.equal(await clearPaperLessonProgressSafely(() => { assert.fail('must not start another deletion') }), false)
    assert.deepEqual([...mocks.values], before)
  } finally { if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else delete globalThis.navigator; mocks.restore() }
})

test('按 paperId 保存关卡、保留通关记录并发事件', () => {
  const mocks = installStorage()
  try {
    savePaperLessonStep('paper-one', 3)
    savePaperLessonStep('paper-one', 5, true)
    savePaperLessonStep('paper-one', 1)
    assert.deepEqual(readPaperLessonProgress()['paper-one'], { step: 1, completed: true })
    assert.equal(mocks.events.length, 3)
  } finally { mocks.restore() }
})

test('LessonStep 对接既有 stage1、stage3、stage4 反馈节点', () => {
  assert.equal(lessonStepToLearningStage(1), 1)
  assert.equal(lessonStepToLearningStage(2), 1)
  assert.equal(lessonStepToLearningStage(3), 3)
  assert.equal(lessonStepToLearningStage(4), 3)
  assert.equal(lessonStepToLearningStage(5), 4)
  assert.deepEqual(applyFeedbackNudge({ shown: false }, { kind: 'progress', stage: lessonStepToLearningStage(5) }), { shown: true, shouldShow: true })
})

test('Hub CTA 按未开始、续学和通关状态稳定生成', () => {
  assert.equal(getPaperLessonCta(undefined), '开始')
  assert.equal(getPaperLessonCta({ step: 3, completed: false }), '继续第 3 关')
  assert.equal(getPaperLessonCta({ step: 5, completed: true }), '复习')
})

test('汇总优先续学中的课程，再进入第一门未完成课', () => {
  const ids = ['one', 'two', 'three']
  assert.deepEqual(getPaperLessonSummary({ one: { step: 5, completed: true }, two: { step: 3, completed: false } }, ids), { completed: 1, total: 3, nextId: 'two' })
  assert.deepEqual(getPaperLessonSummary({ one: { step: 5, completed: true } }, ids), { completed: 1, total: 3, nextId: 'two' })
})

test('Hub 主 CTA 明确区分未开始、进行中和全部通关', () => {
  const ids = ['one', 'two', 'three']
  assert.deepEqual(getPaperLessonHubCta({}, ids), { label: '开始主线', paperId: 'one' })
  assert.deepEqual(getPaperLessonHubCta({ one: { step: 5, completed: true }, two: { step: 3, completed: false } }, ids), { label: '继续主线', paperId: 'two' })
  assert.deepEqual(getPaperLessonHubCta({ one: { step: 5, completed: true }, two: { step: 5, completed: true }, three: { step: 5, completed: true } }, ids), { label: '复习课程', paperId: undefined })
})
