import assert from 'node:assert/strict'
import test from 'node:test'
import { clearProgress, markProgress } from './progress.ts'

const progressKey = 'genai-learning-progress-v1'

function installBrowserMocks({ initial = {}, failSet = false, failRemove = false } = {}) {
  const values = new Map([[progressKey, JSON.stringify(initial)]])
  const events = []
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
    value: { dispatchEvent: (event) => events.push(event.type) },
  })
  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    value: class CustomEvent {
      constructor(type) { this.type = type }
    },
  })
  console.warn = (message) => warnings.push(message)

  return {
    events,
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
