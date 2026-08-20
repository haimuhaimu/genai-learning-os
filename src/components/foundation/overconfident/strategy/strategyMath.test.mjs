import assert from 'node:assert/strict'
import test from 'node:test'
import {
  COLD_START_BUCKETS,
  DEFAULT_COLD_START,
  DEFAULT_REACH,
  DEFAULT_RISK,
  REACH_BUCKETS,
  calculateColdStart,
  calculateReach,
  calculateRisk,
  normalizeRiskControls,
  offlineBinaryCrossEntropy,
} from './strategyMath.ts'
import {
  EXPERIMENT_STATE_KEY,
  LEGACY_EXPERIMENT_STATE_KEY,
  initialStrategyState,
  readStrategyState,
  writeStrategyState,
} from '../caseStorage.ts'
import { advanceCrossEntropyInsight } from '../experimentProgress.ts'

const near = (actual, expected, tolerance = 0.011) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`)
const numericValues = (value) => Object.values(value).flatMap((item) => {
  if (typeof item === 'number') return [item]
  if (Array.isArray(item)) return item.flatMap((entry) => numericValues(entry))
  if (item && typeof item === 'object') return numericValues(item)
  return []
})

function assertFiniteNonNegative(value) {
  for (const number of numericValues(value)) {
    assert.ok(Number.isFinite(number), `${number} 应为有限数`)
    assert.ok(number >= 0, `${number} 应为非负数`)
  }
}

test('三个案例默认值给出稳定的关键结果', () => {
  const cold = calculateColdStart(DEFAULT_COLD_START)
  near(cold.found, 38.67)
  near(cold.missed, 18.33)
  near(cold.midLowFeedbackShare, 70.59)

  const reach = calculateReach(DEFAULT_REACH)
  near(reach.reached, 3000)
  near(reach.expectedConversions, 240)
  near(reach.netRevenue, 16200)
  near(reach.newAuthorShare, 32.5)

  const risk = calculateRisk(DEFAULT_RISK)
  near(risk.directCount, 250)
  near(risk.reviewCount, 200)
  near(risk.allowedRisk, 43.9)
  near(risk.totalCost, 14830.2)
  near(risk.highValueHarm, 67.6)
})

test('阈值边界有效，风险限制始终满足 b > a', () => {
  assert.equal(calculateColdStart({ ...DEFAULT_COLD_START, threshold: 0.3 }).expandedCount, 600)
  assert.equal(calculateColdStart({ ...DEFAULT_COLD_START, threshold: 0.9 }).expandedCount, 20)
  assert.equal(calculateReach({ ...DEFAULT_REACH, threshold: 0.3 }).reached, 25000)
  const normalized = normalizeRiskControls({ ...DEFAULT_RISK, reviewStart: 0.7, directLimit: 0.7 })
  assert.ok(normalized.directLimit > normalized.reviewStart)
  assert.equal(normalized.directLimit, 0.8)
})

test('相同输入始终得到相同输出', () => {
  assert.deepEqual(calculateColdStart(DEFAULT_COLD_START), calculateColdStart({ ...DEFAULT_COLD_START }))
  assert.deepEqual(calculateReach(DEFAULT_REACH), calculateReach({ ...DEFAULT_REACH }))
  assert.deepEqual(calculateRisk(DEFAULT_RISK), calculateRisk({ ...DEFAULT_RISK }))
})

test('所有策略边界输出均有限且非负', () => {
  for (const threshold of [0.3, 0.9]) {
    for (const exploration of [0, 0.2]) assertFiniteNonNegative(calculateColdStart({ threshold, exploration, guarantee: false }))
    for (const frequency of [1, 2]) assertFiniteNonNegative(calculateReach({ threshold, frequency, newAuthorQuota: 0.4 }))
  }
  for (const reviewStart of [0.3, 0.7]) {
    for (const directLimit of [0.7, 0.9]) assertFiniteNonNegative(calculateRisk({ reviewStart, directLimit, reviewBudget: 500, softProtection: true }))
  }
})

test('探索、配额和预算变化符合预期方向', () => {
  const noExplore = calculateColdStart({ ...DEFAULT_COLD_START, exploration: 0, guarantee: false })
  const explore = calculateColdStart({ ...DEFAULT_COLD_START, exploration: 0.2, guarantee: false })
  assert.ok(explore.found > noExplore.found)
  assert.ok(explore.missed < noExplore.missed)

  const quota20 = calculateReach({ ...DEFAULT_REACH, newAuthorQuota: 0.2 })
  const quota40 = calculateReach({ ...DEFAULT_REACH, newAuthorQuota: 0.4 })
  assert.ok(quota40.newAuthorShare >= quota20.newAuthorShare)
  assert.equal(quota40.reached, quota20.reached)

  const budget200 = calculateRisk({ ...DEFAULT_RISK, reviewBudget: 200 })
  const budget500 = calculateRisk({ ...DEFAULT_RISK, reviewBudget: 500 })
  assert.ok(budget500.reviewCount > budget200.reviewCount)
  assert.ok(budget500.allowedRisk < budget200.allowedRisk)
})

test('频控第二次增加转化但成本按两次计算', () => {
  const once = calculateReach({ ...DEFAULT_REACH, frequency: 1 })
  const twice = calculateReach({ ...DEFAULT_REACH, frequency: 2 })
  near(twice.expectedConversions, once.expectedConversions * 1.3)
  near(twice.frequencyCost, once.frequencyCost * 2)
})

test('同一离线全集交叉熵不随策略阈值改变', () => {
  const coldCe = offlineBinaryCrossEntropy(COLD_START_BUCKETS)
  const reachCe = offlineBinaryCrossEntropy(REACH_BUCKETS)
  calculateColdStart({ ...DEFAULT_COLD_START, threshold: 0.3 })
  calculateColdStart({ ...DEFAULT_COLD_START, threshold: 0.9 })
  calculateReach({ ...DEFAULT_REACH, threshold: 0.3 })
  calculateReach({ ...DEFAULT_REACH, threshold: 0.9 })
  assert.equal(offlineBinaryCrossEntropy(COLD_START_BUCKETS), coldCe)
  assert.equal(offlineBinaryCrossEntropy(REACH_BUCKETS), reachCe)
})

test('v1 / v2 状态迁移到 v3，只映射 tab 与已探索案例', () => {
  const v1 = { getItem: (key) => key === LEGACY_EXPERIMENT_STATE_KEY ? '{"schemaVersion":1,"explored":true}' : null }
  const v1State = readStrategyState(v1)
  assert.equal(v1State.schemaVersion, 3)
  assert.deepEqual(v1State.exploredCases, ['coldStart'])
  assert.deepEqual(v1State.coldStart, DEFAULT_COLD_START)

  const v2 = { getItem: (key) => key === LEGACY_EXPERIMENT_STATE_KEY ? '{"schemaVersion":2,"activeTab":"diagnosis","exploredScenes":["weather","diagnosis"]}' : null }
  const v2State = readStrategyState(v2)
  assert.equal(v2State.activeTab, 'monetization')
  assert.deepEqual(v2State.exploredCases, ['coldStart', 'monetization'])
})

test('v3 坏数据回退，写入只使用 v3 key', () => {
  assert.deepEqual(readStrategyState({ getItem: () => '{broken' }), initialStrategyState())
  const values = new Map()
  assert.equal(writeStrategyState({ setItem: (key, value) => values.set(key, value) }, initialStrategyState()), true)
  assert.equal(values.size, 1)
  assert.ok(values.has(EXPERIMENT_STATE_KEY))
})

test('全站进度只推进 cross-entropy stage 3', () => {
  const calls = []
  advanceCrossEntropyInsight((nodeId, stage) => calls.push([nodeId, stage]))
  assert.deepEqual(calls, [['cross-entropy', 3]])
})
