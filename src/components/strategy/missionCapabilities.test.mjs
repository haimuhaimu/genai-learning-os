import assert from 'node:assert/strict'
import test from 'node:test'
import { contextWindowBudgetSpec, ragChunkingSpec } from './mechanismCases.ts'
import { deriveCapabilityEvidence } from './missionCapabilities.ts'

const specs = [contextWindowBudgetSpec, ragChunkingSpec]
const completion = (passed = true, finalControls = contextWindowBudgetSpec.defaults) => ({
  attemptStartedAt: '2026-08-25T01:00:00.000Z',
  formedAt: '2026-08-25T03:00:00.000Z',
  prediction: '先控制预算',
  finalControls,
  stress: { presetId: 'eight-k-window', passed, baseControls: { ...contextWindowBudgetSpec.defaults }, ranAt: '2026-08-25T02:00:00.000Z' },
})
const record = {
  caseId: 'context-window-budget', routeId: 'llm', level: 2,
  controls: { ...contextWindowBudgetSpec.defaults }, metrics: [], summaryText: '已形成',
  updatedAt: '2026-08-25T03:00:00.000Z', missionCompletion: completion(),
}

test('能力矩阵空态固定为五维且只给待补动作', () => {
  const rows = deriveCapabilityEvidence([], specs)
  assert.equal(rows.length, 5)
  assert.ok(rows.every((row) => row.sources.length === 0 && row.pending.length === 2))
  assert.equal('score' in rows[0], false)
})

test('完整通过证据同时产生策略形成与压力通过覆盖', () => {
  const row = deriveCapabilityEvidence([record], specs).find((item) => item.id === 'budget-allocation')
  assert.equal(row.sources[0].strategyFormed, true)
  assert.equal(row.sources[0].stressPassed, true)
  assert.deepEqual(row.pending, [])
})

test('完整失败证据只产生策略形成与完整复盘覆盖', () => {
  const failed = { ...record, missionCompletion: completion(false) }
  const row = deriveCapabilityEvidence([failed], specs).find((item) => item.id === 'robustness-testing')
  assert.equal(row.sources[0].strategyFormed, true)
  assert.equal(row.sources[0].stressPassed, false)
  assert.deepEqual(row.pending, ['通过一次确定性压力测试'])
})

test('旧 level 2 与独立 passed preset 不会拼成新 Mission 能力证据', () => {
  const legacy = { ...record, missionCompletion: undefined, missionEvidence: { passedStressPresetIds: ['eight-k-window'], lastStressAt: '2026-08-25T02:00:00.000Z' } }
  const row = deriveCapabilityEvidence([legacy], specs).find((item) => item.id === 'tradeoff-reasoning')
  assert.equal(row.sources.length, 0)
  assert.deepEqual(row.pending, ['形成一份策略摘要', '通过一次确定性压力测试'])
})

test('最终 controls 与压力基础 controls 不一致时不消费证据', () => {
  const mismatched = { ...record, missionCompletion: completion(true, { ...contextWindowBudgetSpec.defaults, window: 8000 }) }
  const row = deriveCapabilityEvidence([mismatched], specs).find((item) => item.id === 'budget-allocation')
  assert.equal(row.sources.length, 0)
})

test('未配置 mission 的案例不被能力矩阵重新解释', () => {
  const nonMissionSpec = { ...contextWindowBudgetSpec, id: 'rag-budget', mission: undefined }
  const nonMissionRecord = { ...record, caseId: 'rag-budget', missionCompletion: undefined }
  const rows = deriveCapabilityEvidence([nonMissionRecord], [nonMissionSpec])
  assert.ok(rows.every((row) => row.sources.length === 0))
  assert.equal(nonMissionRecord.level, 2)
  assert.equal(nonMissionRecord.summaryText, '已形成')
})
