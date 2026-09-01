import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateLearningCapabilities, clearProgress, markProgress } from './progress.ts'

const progressKey = 'genai-learning-progress-v1'

function installBrowserMocks({ initial = {}, failSet = false, failRemove = false } = {}) {
  const values = new Map([[progressKey, JSON.stringify(initial)]])
  const events = []
  const eventDetails = []
  const warnings = []
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
  const originalCustomEvent = globalThis.CustomEvent
  const originalWarn = console.warn

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        if (failSet) throw new Error('storage unavailable')
        values.set(key, value)
      },
      removeItem: (key) => {
        if (failRemove) throw new Error('storage unavailable')
        values.delete(key)
      },
    },
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { dispatchEvent: (event) => { events.push(event.type); eventDetails.push(event.detail) } },
  })
  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    value: class CustomEvent {
      constructor(type, init) { this.type = type; this.detail = init?.detail }
    },
  })
  console.warn = (message) => warnings.push(message)

  return {
    events,
    eventDetails,
    values,
    warnings,
    restore() {
      if (originalWindow === undefined) delete globalThis.window
      else Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
      if (originalLocalStorage === undefined) delete globalThis.localStorage
      else Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalLocalStorage })
      if (originalCustomEvent === undefined) delete globalThis.CustomEvent
      else Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: originalCustomEvent })
      console.warn = originalWarn
    },
  }
}

test('进度写入成功后才发送变化事件', () => {
  const mocks = installBrowserMocks({ initial: { nodeA: 1 } })
  try {
    const progress = markProgress('nodeA', 2)
    assert.deepEqual(progress, { nodeA: 2 })
    assert.deepEqual(JSON.parse(mocks.values.get(progressKey)), { nodeA: 2 })
    assert.deepEqual(mocks.events, ['genai-progress-change'])
    assert.deepEqual(mocks.eventDetails, [{ reason: 'mark', nodeId: 'nodeA', stage: 2 }])
    assert.deepEqual(mocks.warnings, [])
  } finally {
    mocks.restore()
  }
})

test('进度写入失败时保留旧状态且不发送成功变化事件', () => {
  const mocks = installBrowserMocks({ initial: { nodeA: 1 }, failSet: true })
  try {
    assert.deepEqual({ ...markProgress('nodeA', 3) }, { nodeA: 1 })
    assert.deepEqual(mocks.events, [])
    assert.deepEqual(mocks.warnings, ['学习进度暂时无法保存到本机存储。'])
  } finally {
    mocks.restore()
  }
})

test('清除失败返回 false 且不发送成功变化事件', () => {
  const mocks = installBrowserMocks({ initial: { nodeA: 1 }, failRemove: true })
  try {
    assert.equal(clearProgress(), false)
    assert.ok(mocks.values.has(progressKey))
    assert.deepEqual(mocks.events, [])
    assert.deepEqual(mocks.warnings, ['学习进度暂时无法从本机存储清除。'])
  } finally {
    mocks.restore()
  }
})


test('相同或更低阶段不会重复写入或发送变化事件', () => {
  const mocks = installBrowserMocks({ initial: { nodeA: 2 } })
  try {
    assert.deepEqual({ ...markProgress('nodeA', 2) }, { nodeA: 2 })
    assert.deepEqual({ ...markProgress('nodeA', 1) }, { nodeA: 2 })
    assert.deepEqual(JSON.parse(mocks.values.get(progressKey)), { nodeA: 2 })
    assert.deepEqual(mocks.events, [])
    assert.deepEqual(mocks.warnings, [])
  } finally {
    mocks.restore()
  }
})

test('能力画像把实验、评审、工程与路线广度聚合为可解释分数', () => {
  const capabilities = calculateLearningCapabilities({
    softmax: 3,
    'llm-token': 4,
    'img-space': 2,
    'agent-book:ch1': 4,
    'agent-book:kv-cache': 3,
  })
  const scores = Object.fromEntries(capabilities.map((item) => [item.id, item.score]))
  assert.equal(scores.mechanism, 80)
  assert.equal(scores.experiment, 80)
  assert.equal(scores.judgment, 40)
  assert.equal(scores.engineering, 88)
  assert.equal(scores.breadth, 80)
})

test('空进度生成零分能力画像而不是报错', () => {
  assert.deepEqual(calculateLearningCapabilities({}).map((item) => item.score), [0, 0, 0, 0, 0])
})
