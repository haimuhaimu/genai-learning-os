import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateBayesRollout, calculateCalibration, DEFAULT_BAYES, DEFAULT_CALIBRATION } from './decisionMathProbabilityCases.ts'
import { calculateOptimizerStability, calculateSimilarityGating, DEFAULT_OPTIMIZER, DEFAULT_SIMILARITY } from './decisionMathRetrievalOptimizationCases.ts'
import { calculateCausalDesign, calculateEntropyKl, DEFAULT_CAUSAL, DEFAULT_ENTROPY_KL } from './decisionMathDistributionExperimentCases.ts'
import { calculateErrorPropagation, calculateRewardPolicy, DEFAULT_PROPAGATION, DEFAULT_REWARD } from './decisionMathSequentialCases.ts'
import { centerCaseCatalog, decisionMathCaseCatalog, decisionMathCaseIds, strategyCaseCatalog } from './caseCatalog.ts'

const calculators = [calculateCalibration, calculateBayesRollout, calculateSimilarityGating, calculateOptimizerStability, calculateEntropyKl, calculateCausalDesign, calculateRewardPolicy, calculateErrorPropagation]
const defaults = [DEFAULT_CALIBRATION, DEFAULT_BAYES, DEFAULT_SIMILARITY, DEFAULT_OPTIMIZER, DEFAULT_ENTROPY_KL, DEFAULT_CAUSAL, DEFAULT_REWARD, DEFAULT_PROPAGATION]
const metric = (result, id) => result.metrics.find((item) => item.id === id).value

function assertFiniteNonNegative(result) {
  result.metrics.forEach((item) => assert.ok(Number.isFinite(item.value) && item.value >= 0, `${item.id} 应为有限非负数`))
}

test('8 个数学 Case 默认结果稳定', () => {
  assert.deepEqual(calculateCalibration(DEFAULT_CALIBRATION).metrics.map((item) => item.display), ['8.1%', '5.9%', '9 / 百次', '4.8%'])
  assert.deepEqual(calculateBayesRollout(DEFAULT_BAYES).metrics.map((item) => item.display), ['69.0%', '60.0%', '60.0%–78.1%', '24 点', '24 / 100'])
  assert.deepEqual(calculateSimilarityGating(DEFAULT_SIMILARITY).metrics.map((item) => item.display), ['67%', '50%', '860 / query', '340 ms', '25 / 100'])
  assert.deepEqual(calculateOptimizerStability(DEFAULT_OPTIMIZER).metrics.map((item) => item.display), ['48%', '940 / 1000', '1 次', '142 GPU·h', '18 / 100'])
  assert.deepEqual(calculateEntropyKl(DEFAULT_ENTROPY_KL).metrics.map((item) => item.display), ['1.34', '0.02', '4 / 5', '62%', '88%', '13 / 100', '22 / 100'])
  assert.deepEqual(calculateCausalDesign(DEFAULT_CAUSAL).metrics.map((item) => item.display), ['+1%', '18 / 100', '12 天', '24 点'])
  assert.deepEqual(calculateRewardPolicy(DEFAULT_REWARD).metrics.map((item) => item.display), ['68%', '21 / 100', '1.2 h', '18 点'])
  assert.deepEqual(calculateErrorPropagation(DEFAULT_PROPAGATION).metrics.map((item) => item.display), ['80%', '11 点 / task', '6%', '12 / 100'])
})

test('8 个数学 Case 相同输入确定，且指标有限非负', () => {
  calculators.forEach((calculate, index) => {
    assert.deepEqual(calculate(defaults[index]), calculate({ ...defaults[index] }))
    assertFiniteNonNegative(calculate(defaults[index]))
  })
})

test('数学 Case 全量注册但只在 Hub 可见', () => {
  assert.equal(decisionMathCaseCatalog.length, 8)
  assert.equal(strategyCaseCatalog.length, 19)
  assert.equal(centerCaseCatalog.length, 11)
  assert.ok(decisionMathCaseCatalog.every((item) => item.visibility === 'hub-only' && decisionMathCaseIds.has(item.id)))
  assert.ok(centerCaseCatalog.every((item) => item.routeId !== 'ai-decision-math'))
})

test('分场景校准 ECE 更低，但审核与维护成本更高', () => {
  const raw = calculateCalibration({ policy: 'raw' })
  const segmented = calculateCalibration({ policy: 'segmented' })
  assert.ok(metric(segmented, 'ece') < metric(raw, 'ece'))
  assert.ok(metric(segmented, 'manualReview') > metric(raw, 'manualReview'))
  assert.notEqual(segmented.costs[2].value, raw.costs[2].value)
})

test('小样本下贝叶斯先验显著影响后验', () => {
  const conservative = calculateBayesRollout({ prior: 'conservative' })
  const aggressive = calculateBayesRollout({ prior: 'aggressive' })
  assert.ok(metric(aggressive, 'posteriorMean') - metric(conservative, 'posteriorMean') > 4)
  assert.ok(metric(aggressive, 'scaleRisk') > metric(conservative, 'scaleRisk'))
})

test('低阈值加 rerank 召回更高但成本更高', () => {
  const high = calculateSimilarityGating({ retrieval: 'high' })
  const rerank = calculateSimilarityGating({ retrieval: 'rerank' })
  assert.ok(metric(rerank, 'recall') > metric(high, 'recall'))
  assert.ok(metric(rerank, 'tokens') > metric(high, 'tokens'))
  assert.ok(metric(rerank, 'latency') > metric(high, 'latency'))
})

test('大 LR 下降更快，但重跑与风险更高', () => {
  const sprint = calculateOptimizerStability({ schedule: 'sprint' })
  const guarded = calculateOptimizerStability({ schedule: 'guarded' })
  assert.ok(metric(sprint, 'lossDrop') > metric(guarded, 'lossDrop'))
  assert.ok(metric(sprint, 'reruns') > metric(guarded, 'reruns'))
  assert.ok(metric(sprint, 'stabilityRisk') > metric(guarded, 'stabilityRisk'))
})

test('低熵策略覆盖更少且坍塌风险更高', () => {
  const sharp = calculateEntropyKl({ distribution: 'sharp' })
  const explore = calculateEntropyKl({ distribution: 'explore' })
  assert.ok(metric(sharp, 'entropy') < metric(explore, 'entropy'))
  assert.ok(metric(sharp, 'coverage') < metric(explore, 'coverage'))
  assert.ok(metric(sharp, 'collapseRisk') > metric(explore, 'collapseRisk'))
})

test('分层与 switchback 降低混杂，但周期或工程成本更高', () => {
  const plain = calculateCausalDesign({ design: 'plain' })
  const stratified = calculateCausalDesign({ design: 'stratified' })
  const switchback = calculateCausalDesign({ design: 'switchback' })
  assert.ok(metric(stratified, 'confoundingRisk') < metric(plain, 'confoundingRisk'))
  assert.ok(metric(switchback, 'confoundingRisk') < metric(stratified, 'confoundingRisk'))
  assert.ok(metric(switchback, 'duration') > metric(plain, 'duration'))
  assert.ok(metric(switchback, 'engineeringCost') > metric(plain, 'engineeringCost'))
})

test('外部 verifier 降低作弊但反馈更慢', () => {
  const immediate = calculateRewardPolicy({ reward: 'immediate' })
  const verifier = calculateRewardPolicy({ reward: 'verifier' })
  assert.ok(metric(verifier, 'hackingRisk') < metric(immediate, 'hackingRisk'))
  assert.ok(metric(verifier, 'feedbackDelay') > metric(immediate, 'feedbackDelay'))
  assert.ok(metric(verifier, 'verificationCost') > metric(immediate, 'verificationCost'))
})

test('前置 gate 降低灾难失败，但增加人工与成本', () => {
  const gate = calculateErrorPropagation({ policy: 'gate' })
  const retry = calculateErrorPropagation({ policy: 'retry' })
  assert.ok(metric(gate, 'catastrophicRisk') < metric(retry, 'catastrophicRisk'))
  assert.ok(metric(gate, 'humanIntervention') > metric(retry, 'humanIntervention'))
  assert.ok(metric(gate, 'averageCost') > metric(retry, 'averageCost'))
})
