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

test('学习记录覆盖使用完整课程分母，不把少量已开始节点当作满分', () => {
  const capabilities = calculateLearningCapabilities({
    softmax: 3,
    'llm-token': 4,
    'img-space': 2,
    'agent-book-ch1': 4,
    'agent-book-lab-kv-cache': 3,
  })
  const scores = Object.fromEntries(capabilities.map((item) => [item.id, item.score]))
  assert.deepEqual(scores, { mechanism: 12, experiment: 10, judgment: 3, engineering: 10, breadth: 100 })
  assert.deepEqual(capabilities.map(({ covered, total }) => [covered, total]), [[3, 25], [3, 31], [1, 30], [2, 21], [4, 4]])
})

test('未知键、论文记录和 K3 双键不会制造课程证据覆盖', () => {
  const capabilities = calculateLearningCapabilities({
    'paper-lab:attention-is-all-you-need': 4,
    'k3:concept:goal': 4,
    'k3:build:goal': 4,
    'llm-unknown': 4,
    'agent-book:ch1': 4,
  })
  assert.deepEqual(capabilities.map((item) => item.score), [0, 0, 0, 0, 0])
})

test('未达手算门槛的正式节点不会稀释已有机制记录的固定覆盖率', () => {
  const before = calculateLearningCapabilities({ softmax: 4 }).find((item) => item.id === 'mechanism')
  const after = calculateLearningCapabilities({ softmax: 4, probability: 1 }).find((item) => item.id === 'mechanism')
  assert.equal(before.score, 4)
  assert.equal(after.score, 4)
})

test('空进度生成零分能力画像而不是报错', () => {
  assert.deepEqual(calculateLearningCapabilities({}).map((item) => item.score), [0, 0, 0, 0, 0])
})
