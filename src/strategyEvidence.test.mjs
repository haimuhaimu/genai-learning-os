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
