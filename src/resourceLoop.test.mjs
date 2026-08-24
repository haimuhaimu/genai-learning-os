import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearResourceLoop,
  isResourceLoopComplete,
  readResourceLoops,
  RESOURCE_LOOP_KEY,
  sanitizeResourceLoopRecord,
  saveInitialJudgment,
  saveReviewJudgment,
  touchResource,
} from './resourceLoop.ts'

function memoryStorage(initial = new Map(), failWrites = false) {
  return {
    values: initial,
    getItem: (key) => initial.get(key) ?? null,
    setItem: (key, value) => {
      if (failWrites) throw new Error('storage unavailable')
      initial.set(key, value)
    },
  }
}

const noEvents = () => {
  const originalWindow = globalThis.window
  Object.defineProperty(globalThis, 'window', { configurable: true, value: undefined })
  return () => {
    if (originalWindow === undefined) delete globalThis.window
    else Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
  }
}

test('损坏 schema 和非法记录安全降级', () => {
  assert.deepEqual({ ...readResourceLoops({ getItem: () => '{bad' }) }, {})
  assert.deepEqual({ ...readResourceLoops({ getItem: () => JSON.stringify({ schemaVersion: 9, cases: {} }) }) }, {})
  assert.equal(sanitizeResourceLoopRecord({ caseId: 'unknown', resources: [] }), null)
})

test('首次判断、资源和复盘按 case 隔离并完成闭环', () => {
  const restore = noEvents()
  const storage = memoryStorage()
  try {
    saveInitialJudgment('rag-budget', '先限制召回数量', storage, '2026-08-25T01:00:00.000Z')
    touchResource('rag-budget', { type: 'paper', id: 'attention-is-all-you-need' }, storage, '2026-08-25T02:00:00.000Z')
    saveReviewJudgment('rag-budget', '改为按证据质量动态调整', storage, '2026-08-25T03:00:00.000Z')
    saveInitialJudgment('image-unit-cost', '控制重试', storage, '2026-08-25T04:00:00.000Z')
    const loops = readResourceLoops(storage)
    assert.equal(loops['rag-budget'].resources.length, 1)
    assert.equal(isResourceLoopComplete(loops['rag-budget']), true)
    assert.equal(isResourceLoopComplete(loops['image-unit-cost']), false)
    assert.notEqual(loops['rag-budget'].initialJudgment, loops['image-unit-cost'].initialJudgment)
  } finally { restore() }
})

test('重复触达去重并更新最近时间', () => {
  const restore = noEvents()
  const storage = memoryStorage()
  try {
    touchResource('refund-gate', { type: 'video', id: 'agent-course' }, storage, '2026-08-25T01:00:00.000Z')
    touchResource('refund-gate', { type: 'video', id: 'agent-course' }, storage, '2026-08-25T02:00:00.000Z')
    const record = readResourceLoops(storage)['refund-gate']
    assert.equal(record.resources.length, 1)
    assert.equal(record.resources[0].touchedAt, '2026-08-25T02:00:00.000Z')
  } finally { restore() }
})

test('写入失败时保留当前会话状态', () => {
  const restore = noEvents()
  const storage = memoryStorage(new Map(), true)
  try {
    const saved = saveInitialJudgment('new-information', '先看新观察', storage, '2026-08-25T01:00:00.000Z')
    assert.equal(saved.initialJudgment, '先看新观察')
    assert.equal(readResourceLoops(storage)['new-information'].initialJudgment, '先看新观察')
  } finally { restore() }
})

test('清除只移除当前 case', () => {
  const restore = noEvents()
  const storage = memoryStorage(new Map([[RESOURCE_LOOP_KEY, JSON.stringify({ schemaVersion: 1, cases: {
    'rag-budget': { caseId: 'rag-budget', initialJudgment: 'A', reviewJudgment: '', resources: [], updatedAt: '2026-08-25T01:00:00.000Z' },
    'image-unit-cost': { caseId: 'image-unit-cost', initialJudgment: 'B', reviewJudgment: '', resources: [], updatedAt: '2026-08-25T01:00:00.000Z' },
  } })]]))
  try {
    clearResourceLoop('rag-budget', storage)
    const loops = readResourceLoops(storage)
    assert.equal(loops['rag-budget'], undefined)
    assert.equal(loops['image-unit-cost'].initialJudgment, 'B')
  } finally { restore() }
})
