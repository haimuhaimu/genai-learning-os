import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDebriefText, compareEvidence, deriveMissionPhase, evaluateMission, runStressPreset } from './missionEngine.ts'
import { contextWindowBudgetSpec } from './mechanismCases.ts'

const gates = [
  { id: 'higher', metricId: 'quality', operator: '>=', target: 10, label: '质量', returnControlId: 'x' },
  { id: 'lower', metricId: 'cost', operator: '<=', target: 2, label: '成本', returnControlId: 'x' },
]
const evidence = (quality, cost) => ({ metrics: [{ id: 'quality', label: '质量', value: quality, display: String(quality) }, { id: 'cost', label: '成本', value: cost, display: String(cost) }] })

test('门槛边界通过，缺失指标按无法计算失败', () => {
  assert.deepEqual(evaluateMission(gates, evidence(10, 2)).gates.map((item) => item.passed), [true, true])
  const missing = evaluateMission(gates, { metrics: [] })
  assert.equal(missing.passed, false)
  assert.match(missing.gates[0].reason, /无法计算/)
})

test('delta 按门槛方向解释改善、恶化和不变', () => {
  assert.deepEqual(compareEvidence(evidence(8, 3), evidence(10, 2), gates).map((item) => item.meaning), ['改善', '改善'])
  assert.deepEqual(compareEvidence(evidence(10, 2), evidence(8, 3), gates).map((item) => item.meaning), ['恶化', '恶化'])
  assert.deepEqual(compareEvidence(evidence(10, 2), evidence(10, 2), gates).map((item) => item.meaning), ['不变', '不变'])
  assert.equal(compareEvidence({ metrics: [] }, evidence(10, 2), gates)[0].meaning, '无法比较')
})

test('压力 preset 重复运行完全一致且返回失败旋钮', () => {
  const preset = contextWindowBudgetSpec.mission.stressPresets[0]
  const first = runStressPreset(contextWindowBudgetSpec, contextWindowBudgetSpec.defaults, preset)
  const second = runStressPreset(contextWindowBudgetSpec, { ...contextWindowBudgetSpec.defaults }, preset)
  assert.deepEqual(first, second)
  assert.equal(first.evaluation.passed, false)
  assert.deepEqual(first.failedControlIds, ['retrievalK', 'historyTurns', 'answerMode'])
})

test('任务阶段只由显式行为推进', () => {
  assert.equal(deriveMissionPhase({ predictionLocked: false }), 'draft')
  assert.equal(deriveMissionPhase({ predictionLocked: false, formed: true, lastStress: { presetId: 'x', passed: true, metrics: [], ranAt: '' } }), 'draft')
  assert.equal(deriveMissionPhase({ predictionLocked: true }), 'prediction-locked')
  assert.equal(deriveMissionPhase({ predictionLocked: true, explored: true }), 'exploring')
  assert.equal(deriveMissionPhase({ predictionLocked: true, lastStress: { presetId: 'x', passed: false, metrics: [], ranAt: '' } }), 'stress-fail')
  assert.equal(deriveMissionPhase({ predictionLocked: true, formed: true }), 'prediction-locked')
  assert.equal(deriveMissionPhase({ predictionLocked: true, formed: true, lastStress: { presetId: 'x', passed: true, metrics: [], ranAt: '' } }), 'debrief')
})

test('复盘文本稳定覆盖完整与缺失证据', () => {
  const base = { title: '案例', controls: { x: 1 }, summary: '摘要', deltas: compareEvidence(evidence(8, 3), evidence(10, 2), gates), transferQuestion: '如何迁移？' }
  const missing = buildDebriefText(base)
  assert.match(missing, /锁定预测：未记录/)
  assert.match(missing, /最近压力测试：未执行/)
  assert.equal(missing, buildDebriefText(base))
  const complete = buildDebriefText({ ...base, prediction: '先降成本', stress: { label: '固定压力', evaluation: evaluateMission(gates, evidence(10, 2)) } })
  assert.match(complete, /固定压力：通过/)
  assert.match(complete, /迁移问题：如何迁移/)
})
