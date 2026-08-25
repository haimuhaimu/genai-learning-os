import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearResourceLoop,
  isResourceLoopComplete,
  readResourceLoops,
  reopenMissionAttempt,
  RESOURCE_LOOP_KEY,
  sanitizeResourceLoopRecord,
  saveInitialJudgment,
  saveMissionSnapshot,
  saveMissionStress,
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


test('首次判断锁定幂等且单快照替换', () => {
  const restore = noEvents(), storage = memoryStorage()
  try {
    const first = saveInitialJudgment('context-window-budget', '窗口会溢出', storage, '2026-08-25T01:00:00.000Z')
    const locked = saveInitialJudgment('context-window-budget', '试图覆盖', storage, '2026-08-25T02:00:00.000Z')
    assert.equal(locked.initialJudgment, first.initialJudgment)
    assert.equal(locked.initialUpdatedAt, first.initialUpdatedAt)
    saveMissionSnapshot('context-window-budget', { controls: { window: 8000 }, metrics: [{ id: 'coverage', label: '覆盖', display: '88%', value: 87.5 }], savedAt: '2026-08-25T03:00:00.000Z' }, storage)
    saveMissionSnapshot('context-window-budget', { controls: { window: 16000 }, metrics: [{ id: 'coverage', label: '覆盖', display: '100%', value: 100 }], savedAt: '2026-08-25T04:00:00.000Z' }, storage)
    assert.equal(readResourceLoops(storage)['context-window-budget'].missionAttempt.snapshot.controls.window, 16000)
  } finally { restore() }
})

test('重开只清当前预测与任务比较，保留旧复盘、资源和其他案例', () => {
  const restore = noEvents(), storage = memoryStorage()
  try {
    saveInitialJudgment('context-window-budget', '预测', storage, '2026-08-25T01:00:00.000Z')
    saveReviewJudgment('context-window-budget', '旧复盘', storage, '2026-08-25T02:00:00.000Z')
    touchResource('context-window-budget', { type: 'paper', id: 'attention-is-all-you-need' }, storage, '2026-08-25T03:00:00.000Z')
    saveMissionStress('context-window-budget', { presetId: 'eight-k-window', passed: false, metrics: [{ id: 'cost', label: '成本', display: '0.3', value: .3 }], ranAt: '2026-08-25T04:00:00.000Z' }, storage)
    saveInitialJudgment('rag-chunking', '另一个案例', storage, '2026-08-25T05:00:00.000Z')
    reopenMissionAttempt('context-window-budget', storage, '2026-08-25T06:00:00.000Z')
    const loops = readResourceLoops(storage)
    assert.equal(loops['context-window-budget'].initialJudgment, '')
    assert.equal(loops['context-window-budget'].missionAttempt, undefined)
    assert.equal(loops['context-window-budget'].reviewJudgment, '旧复盘')
    assert.equal(loops['context-window-budget'].resources.length, 1)
    assert.equal(loops['rag-chunking'].initialJudgment, '另一个案例')
  } finally { restore() }
})

test('旧记录兼容且损坏 mission 字段不牵连既有数据', () => {
  const old = sanitizeResourceLoopRecord({ caseId: 'rag-chunking', initialJudgment: '旧预测', reviewJudgment: '旧复盘', resources: [], updatedAt: '2026-08-25T01:00:00.000Z' })
  assert.equal(old.initialJudgment, '旧预测'); assert.equal(old.missionAttempt, undefined)
  const bad = sanitizeResourceLoopRecord({ ...old, missionAttempt: { snapshot: { controls: { bad: {} }, metrics: [{ id: 'x', label: 'x', display: 'x', value: 'NaN' }], savedAt: 'bad' }, lastStress: { presetId: '../bad', passed: 'yes' } } })
  assert.equal(bad.reviewJudgment, '旧复盘'); assert.equal(bad.missionAttempt, undefined)
})
