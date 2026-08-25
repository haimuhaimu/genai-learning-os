import assert from 'node:assert/strict'
import test from 'node:test'
import {
  mergeStrategyEvidence,
  readStrategyEvidence,
  sanitizeEvidenceRecord,
  saveStrategyEvidence,
  STRATEGY_EVIDENCE_KEY,
} from './strategyEvidence.ts'

const base = {
  caseId: 'rag-budget', routeId: 'llm', level: 1,
  controls: { k: 5, mode: '带引用生成' },
  metrics: [{ id: 'latency', label: '延迟', display: '480 ms', value: 480 }],
  summaryText: '', updatedAt: '2026-08-19T01:00:00.000Z',
}

function memoryStorage(initial = new Map()) {
  return {
    values: initial,
    getItem: (key) => initial.get(key) ?? null,
    setItem: (key, value) => initial.set(key, value),
  }
}

test('坏 JSON、非数组与坏记录安全回退', () => {
  assert.deepEqual(readStrategyEvidence({ getItem: () => '{broken' }), [])
  assert.deepEqual(readStrategyEvidence({ getItem: () => '{}' }), [])
  assert.equal(sanitizeEvidenceRecord({ ...base, level: 8 }), null)
  assert.equal(sanitizeEvidenceRecord({ ...base, caseId: 'unknown' }), null)
})

test('sanitize 丢弃危险键、嵌套值与非法指标', () => {
  const raw = JSON.parse('{"caseId":"rag-budget","routeId":"llm","level":1,"controls":{"k":5,"__proto__":{"polluted":true},"nested":{"x":1},"bad key":2},"metrics":[{"id":"ok","label":"指标","display":"1","value":1},{"id":"bad","label":"坏","display":"NaN","value":"x"}],"summaryText":"","updatedAt":"2026-08-19T01:00:00.000Z"}')
  const safe = sanitizeEvidenceRecord(raw)
  assert.deepEqual({ ...safe.controls }, { k: 5 })
  assert.equal(safe.metrics.length, 1)
  assert.equal({}.polluted, undefined)
})

test('merge 不降级 level，并由新摘要补全证据', () => {
  const formed = { ...base, level: 2, summaryText: '策略摘要', updatedAt: '2026-08-19T02:00:00.000Z' }
  const merged = mergeStrategyEvidence([formed], { ...base, level: 1, controls: { k: 10 }, updatedAt: '2026-08-19T03:00:00.000Z' })
  assert.equal(merged[0].level, 2)
  assert.equal(merged[0].summaryText, '策略摘要')
  assert.equal(merged[0].controls.k, 10)
})

test('读取时按 case 合并并选择更高证据级别', () => {
  const storage = memoryStorage(new Map([[STRATEGY_EVIDENCE_KEY, JSON.stringify([
    base,
    { ...base, level: 2, summaryText: '已形成', updatedAt: '2026-08-19T00:00:00.000Z' },
  ])]]))
  const records = readStrategyEvidence(storage)
  assert.equal(records.length, 1)
  assert.equal(records[0].level, 2)
  assert.equal(records[0].summaryText, '已形成')
})

test('保存只写 v2 key，并保留其他案例', () => {
  const storage = memoryStorage()
  saveStrategyEvidence(base, storage)
  saveStrategyEvidence({ ...base, caseId: 'image-unit-cost', routeId: 'image', updatedAt: '2026-08-19T04:00:00.000Z' }, storage)
  assert.equal(storage.values.size, 1)
  assert.ok(storage.values.has(STRATEGY_EVIDENCE_KEY))
  assert.equal(readStrategyEvidence(storage).length, 2)
})


test('策略证据仅在成功持久化后派发兼容事件与最小 detail', () => {
  const originalWindow = globalThis.window
  const originalCustomEvent = globalThis.CustomEvent
  const events = []
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { dispatchEvent: (event) => events.push({ type: event.type, detail: event.detail }) },
  })
  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    value: class CustomEvent {
      constructor(type, init) { this.type = type; this.detail = init?.detail }
    },
  })
  try {
    saveStrategyEvidence({ ...base, level: 2, summaryText: '策略摘要' }, memoryStorage())
    assert.deepEqual(events, [{
      type: 'genai-strategy-evidence-change',
      detail: { caseId: 'rag-budget', level: 2, summarySaved: true },
    }])
    saveStrategyEvidence(base, { getItem: () => null, setItem: () => { throw new Error('storage unavailable') } })
    assert.equal(events.length, 1)
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
    if (originalCustomEvent === undefined) delete globalThis.CustomEvent
    else Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: originalCustomEvent })
  }
})


test('压力通过证据取去重并集且不降低历史 level', () => {
  const formed = { ...base, level: 2, summaryText: '策略摘要', missionEvidence: { passedStressPresetIds: ['stress-a'], lastStressAt: '2026-08-19T02:00:00.000Z' } }
  const merged = mergeStrategyEvidence([formed], { ...base, level: 1, missionEvidence: { passedStressPresetIds: ['stress-a', 'stress-b'], lastStressAt: '2026-08-19T03:00:00.000Z' } })[0]
  assert.equal(merged.level, 2)
  assert.deepEqual(merged.missionEvidence.passedStressPresetIds, ['stress-a', 'stress-b'])
  assert.equal(merged.summaryText, '策略摘要')
})

test('旧记录兼容，损坏压力字段被独立清洗', () => {
  const legacy = sanitizeEvidenceRecord(base)
  assert.equal(legacy.missionEvidence, undefined)
  const safe = sanitizeEvidenceRecord({ ...base, missionEvidence: { passedStressPresetIds: ['good-preset', 'good-preset', '../bad', 4], lastStressAt: 'bad' } })
  assert.deepEqual(safe.missionEvidence.passedStressPresetIds, ['good-preset'])
  assert.equal(safe.missionEvidence.lastStressAt, undefined)
})

test('失败压力不写入通过覆盖', () => {
  const merged = mergeStrategyEvidence([], { ...base, missionEvidence: { passedStressPresetIds: [] } })[0]
  assert.equal(merged.missionEvidence, undefined)
})


const completion = (overrides = {}) => ({
  attemptStartedAt: '2026-08-26T01:00:00.000Z',
  formedAt: '2026-08-26T03:00:00.000Z',
  prediction: '先控制预算',
  finalControls: { k: 5, mode: '带引用生成' },
  stress: { presetId: 'stress-a', passed: true, baseControls: { k: 5, mode: '带引用生成' }, ranAt: '2026-08-26T02:00:00.000Z' },
  ...overrides,
})

test('完整 Mission 完成证据原子清洗并保持 controls 绑定', () => {
  const safe = sanitizeEvidenceRecord({ ...base, level: 2, summaryText: '形成摘要', missionCompletion: completion() })
  assert.equal(safe.missionCompletion.prediction, '先控制预算')
  assert.deepEqual({ ...safe.missionCompletion.finalControls }, { k: 5, mode: '带引用生成' })
  assert.deepEqual({ ...safe.missionCompletion.stress.baseControls }, { k: 5, mode: '带引用生成' })
})

test('不同 controls 或时间倒置的摘要与压力不能拼成完整证据', () => {
  const mismatched = sanitizeEvidenceRecord({ ...base, level: 2, summaryText: '错误摘要', missionCompletion: completion({ finalControls: { k: 10, mode: '带引用生成' } }) })
  assert.equal(mismatched.missionCompletion, undefined)
  const wrongAttempt = sanitizeEvidenceRecord({ ...base, level: 2, summaryText: '错误尝试', missionCompletion: completion({ attemptStartedAt: '2026-08-26T02:30:00.000Z' }) })
  assert.equal(wrongAttempt.missionCompletion, undefined)
})

test('分离的旧摘要和压力字段不会被 merge 升级为 missionCompletion', () => {
  const formed = { ...base, level: 2, summaryText: '旧摘要', updatedAt: '2026-08-26T03:00:00.000Z' }
  const stressed = { ...base, level: 1, summaryText: '', updatedAt: '2026-08-26T04:00:00.000Z', missionEvidence: { passedStressPresetIds: ['stress-a'], lastStressAt: '2026-08-26T02:00:00.000Z' } }
  const merged = mergeStrategyEvidence([formed], stressed)[0]
  assert.equal(merged.missionCompletion, undefined)
  assert.equal(merged.level, 2)
  assert.deepEqual(merged.missionEvidence.passedStressPresetIds, ['stress-a'])
})

test('失败压力可保存在完成包但不新增通过集合', () => {
  const failed = completion({ stress: { ...completion().stress, passed: false } })
  const merged = mergeStrategyEvidence([], { ...base, level: 2, summaryText: 'No-Go', missionCompletion: failed })[0]
  assert.equal(merged.missionCompletion.stress.passed, false)
  assert.equal(merged.missionEvidence, undefined)
})


test('Mission 完成证据写入失败时不派发完成事件', () => {
  const originalWindow = globalThis.window
  const originalCustomEvent = globalThis.CustomEvent
  const events = []
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: (event) => events.push(event) } })
  Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail } } })
  try {
    const result = saveStrategyEvidence({ ...base, level: 2, summaryText: '形成摘要', missionCompletion: completion() }, { getItem: () => null, setItem: () => { throw new Error('storage unavailable') } })
    assert.deepEqual(result, [])
    assert.equal(events.length, 0)
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
    if (originalCustomEvent === undefined) delete globalThis.CustomEvent
    else Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: originalCustomEvent })
  }
})


test('已有原子完成包不会吸收后续不同 controls 的摘要文本', () => {
  const formed = { ...base, level: 2, summaryText: '绑定摘要', missionCompletion: completion(), updatedAt: '2026-08-26T03:00:00.000Z' }
  const later = { ...base, level: 2, controls: { k: 10, mode: '带引用生成' }, summaryText: '未绑定摘要', updatedAt: '2026-08-26T04:00:00.000Z' }
  const merged = mergeStrategyEvidence([formed], later)[0]
  assert.equal(merged.summaryText, '绑定摘要')
  assert.equal(merged.missionCompletion.prediction, '先控制预算')
})
