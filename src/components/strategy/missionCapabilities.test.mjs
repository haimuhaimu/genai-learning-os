import assert from 'node:assert/strict'
import test from 'node:test'
import { contextWindowBudgetSpec, ragChunkingSpec } from './mechanismCases.ts'
import { deriveCapabilityEvidence } from './missionCapabilities.ts'

const record = { caseId: 'context-window-budget', routeId: 'llm', level: 2, controls: {}, metrics: [], summaryText: '已形成', updatedAt: '2026-08-25T01:00:00.000Z' }
const specs = [contextWindowBudgetSpec, ragChunkingSpec]

test('能力矩阵空态固定为五维且只给待补动作', () => {
  const rows = deriveCapabilityEvidence([], specs)
  assert.equal(rows.length, 5)
  assert.ok(rows.every((row) => row.sources.length === 0 && row.pending.length === 2))
  assert.equal('score' in rows[0], false)
})

test('仅策略摘要产生策略形成证据，不冒充压力通过', () => {
  const row = deriveCapabilityEvidence([record], specs).find((item) => item.id === 'budget-allocation')
  assert.equal(row.sources[0].strategyFormed, true)
  assert.equal(row.sources[0].stressPassed, false)
  assert.deepEqual(row.pending, ['通过一次确定性压力测试'])
})

test('策略与通过 preset 共同形成两类来源并按案例去重', () => {
  const rows = deriveCapabilityEvidence([{ ...record, missionEvidence: { passedStressPresetIds: ['eight-k-window', 'eight-k-window'] } }], specs)
  const row = rows.find((item) => item.id === 'robustness-testing')
  assert.equal(row.sources.length, 1)
  assert.equal(row.sources[0].strategyFormed, true)
  assert.equal(row.sources[0].stressPassed, true)
  assert.deepEqual(row.pending, [])
})

test('未形成摘要的 level 记录不产生策略证据，但通过压力可独立作为来源', () => {
  const rows = deriveCapabilityEvidence([{ ...record, level: 1, summaryText: '', missionEvidence: { passedStressPresetIds: ['eight-k-window'] } }], specs)
  const row = rows.find((item) => item.id === 'tradeoff-reasoning')
  assert.equal(row.sources[0].strategyFormed, false)
  assert.equal(row.sources[0].stressPassed, true)
})
