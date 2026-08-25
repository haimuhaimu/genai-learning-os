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


test('新压力记录往返保留基础和有效 controls 并清洗非法值', () => {
  const restore = noEvents(), storage = memoryStorage()
  try {
    saveMissionStress('context-window-budget', {
      presetId: 'eight-k-window', passed: true,
      baseControls: { windowSize: 16000, answerMode: 'balanced', enabled: true },
      effectiveControls: { windowSize: 8000, answerMode: 'balanced', enabled: true },
      metrics: [{ id: 'coverage', label: '覆盖率', display: '100%', value: 100 }],
      ranAt: '2026-08-26T04:00:00.000Z',
    }, storage)
    const result = readResourceLoops(storage)['context-window-budget'].missionAttempt.lastStress
    assert.deepEqual({ ...result.baseControls }, { windowSize: 16000, answerMode: 'balanced', enabled: true })
    assert.deepEqual({ ...result.effectiveControls }, { windowSize: 8000, answerMode: 'balanced', enabled: true })
  } finally { restore() }
})

test('压力 controls 仅保留合法键和值，未知但合法的 control ID 保持可读', () => {
  const safe = sanitizeResourceLoopRecord({
    caseId: 'rag-chunking', initialJudgment: '预测', reviewJudgment: '复盘', resources: [], updatedAt: '2026-08-26T01:00:00.000Z',
    missionAttempt: { lastStress: {
      presetId: 'noisy-query', passed: false, ranAt: '2026-08-26T02:00:00.000Z',
      baseControls: { chunkSize: 420, futureControl: 'kept', nested: { bad: true }, infinite: Infinity, 'bad key': 1 },
      effectiveControls: { chunkSize: 280, overlap: 60 },
      metrics: [{ id: 'recall', label: '召回', display: '72%', value: 72 }],
    } },
  })
  assert.deepEqual({ ...safe.missionAttempt.lastStress.baseControls }, { chunkSize: 420, futureControl: 'kept' })
  assert.deepEqual({ ...safe.missionAttempt.lastStress.effectiveControls }, { chunkSize: 280, overlap: 60 })
  assert.equal(safe.reviewJudgment, '复盘')
})

test('旧未绑定压力记录继续可读且不猜测 controls', () => {
  const safe = sanitizeResourceLoopRecord({
    caseId: 'context-window-budget', initialJudgment: '预测', reviewJudgment: '', resources: [], updatedAt: '2026-08-26T01:00:00.000Z',
    missionAttempt: { lastStress: { presetId: 'eight-k-window', passed: true, ranAt: '2026-08-26T02:00:00.000Z', metrics: [{ id: 'coverage', label: '覆盖', display: '90%', value: 90 }] } },
  })
  assert.equal(safe.missionAttempt.lastStress.passed, true)
  assert.equal(safe.missionAttempt.lastStress.baseControls, undefined)
  assert.equal(safe.missionAttempt.lastStress.effectiveControls, undefined)
})
