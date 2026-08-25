import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDebriefText, compareEvidence, compareStressToCurrent, deriveMissionPhase, evaluateMission, getMissionCompletionGate, runStressPreset } from './missionEngine.ts'
import { contextWindowBudgetSpec } from './mechanismCases.ts'

const gates = [
  { id: 'higher', metricId: 'quality', operator: '>=', target: 10, label: '质量', returnControlId: 'x' },
  { id: 'lower', metricId: 'cost', operator: '<=', target: 2, label: '成本', returnControlId: 'x' },
]
const schema = [
  { id: 'x', label: 'X', type: 'range', min: 0, max: 10, step: 1 },
  { id: 'mode', label: '模式', type: 'choice', options: [{ value: 'safe', label: '稳健' }, { value: 'fast', label: '快速' }] },
  { id: 'enabled', label: '启用', type: 'toggle' },
]
const controls = { x: 4, mode: 'safe', enabled: true }
const stress = (baseControls = controls, passed = true) => ({
  presetId: 'fixed-load',
  passed,
  baseControls,
  effectiveControls: { ...baseControls, x: 8 },
  metrics: [{ id: 'quality', label: '质量', value: passed ? 10 : 8, display: passed ? '10' : '8' }],
  ranAt: '2026-08-26T02:00:00.000Z',
})
const prediction = { text: '先控制上下文预算', lockedAt: '2026-08-26T01:00:00.000Z' }
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

test('旧压力结果不能与新 controls 拼成完成态', () => {
  const gate = getMissionCompletionGate({ prediction, schema, currentControls: { ...controls, x: 5 }, stress: stress() })
  assert.deepEqual(gate.missing, ['fresh-stress'])
  assert.deepEqual(gate.stressFreshness, { fresh: false, reason: 'controls-changed' })
  assert.equal(deriveMissionPhase({ predictionLocked: true, explored: true, lastStress: stress(), formed: true, completionGate: gate }), 'exploring')
})

test('未预测或无新鲜压力均不能满足完成门槛', () => {
  const withoutPrediction = getMissionCompletionGate({ schema, currentControls: controls, stress: stress() })
  assert.equal(withoutPrediction.ready, false)
  assert.deepEqual(withoutPrediction.missing, ['prediction'])
  const withoutStress = getMissionCompletionGate({ prediction, schema, currentControls: controls })
  assert.equal(withoutStress.ready, false)
  assert.deepEqual(withoutStress.missing, ['fresh-stress'])
})

test('新鲜度按 schema 比较并忽略对象键顺序与未知键', () => {
  const reordered = { enabled: true, unknown: 'ignored', mode: 'safe', x: 4 }
  assert.deepEqual(compareStressToCurrent(schema, reordered, stress({ mode: 'safe', x: 4, enabled: true })), { fresh: true })
})

test('非法 controls 与旧未绑定压力记录不能成为新鲜证据', () => {
  assert.deepEqual(compareStressToCurrent(schema, { ...controls, x: Number.NaN }, stress()), { fresh: false, reason: 'invalid-controls' })
  assert.deepEqual(compareStressToCurrent(schema, controls, { presetId: 'legacy', passed: true, metrics: [], ranAt: '2026-08-26T02:00:00.000Z' }), { fresh: false, reason: 'legacy-unbound' })
})

test('匹配的失败压力允许完成 No-Go 复盘但不冒充通过', () => {
  const failedStress = stress(controls, false)
  const gate = getMissionCompletionGate({ prediction, schema, currentControls: controls, stress: failedStress })
  assert.equal(gate.ready, true)
  assert.deepEqual(gate.missing, [])
  assert.equal(deriveMissionPhase({ predictionLocked: true, lastStress: failedStress, formed: true, completionGate: gate }), 'debrief')
  assert.equal(failedStress.passed, false)
})

test('任务阶段只由显式且一致的行为推进', () => {
  const freshGate = getMissionCompletionGate({ prediction, schema, currentControls: controls, stress: stress() })
  assert.equal(deriveMissionPhase({ predictionLocked: false, completionGate: freshGate }), 'draft')
  assert.equal(deriveMissionPhase({ predictionLocked: true, completionGate: getMissionCompletionGate({ prediction, schema, currentControls: controls }) }), 'prediction-locked')
  assert.equal(deriveMissionPhase({ predictionLocked: true, explored: true, completionGate: getMissionCompletionGate({ prediction, schema, currentControls: controls }) }), 'exploring')
  assert.equal(deriveMissionPhase({ predictionLocked: true, lastStress: stress(controls, false), completionGate: getMissionCompletionGate({ prediction, schema, currentControls: controls, stress: stress(controls, false) }) }), 'stress-fail')
  assert.equal(deriveMissionPhase({ predictionLocked: true, formed: true, lastStress: stress(), completionGate: freshGate }), 'debrief')
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


test('预测锁定前运行的压力不属于当前尝试', () => {
  const oldStress = { ...stress(), ranAt: '2026-08-25T23:00:00.000Z' }
  const gate = getMissionCompletionGate({ prediction, schema, currentControls: controls, stress: oldStress })
  assert.equal(gate.ready, false)
  assert.deepEqual(gate.missing, ['fresh-stress'])
})
