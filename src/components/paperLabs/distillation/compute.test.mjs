import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_TEMPERATURE,
  MIN_TEMPERATURE,
  distillationCompute,
} from './compute.ts'

const sum = (values) => values.reduce((total, value) => total + value, 0)
const approximatelyEqual = (actual, expected, tolerance = 1e-12) => {
  assert.ok(Math.abs(actual - expected) < tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`)
}
const softmax = (logits) => {
  const maximum = Math.max(...logits)
  const exponentials = logits.map((logit) => Math.exp(logit - maximum))
  const denominator = sum(exponentials)
  return exponentials.map((value) => value / denominator)
}
const klDivergence = (reference, candidate) => reference.reduce((total, probability, index) => (
  total + probability * Math.log(probability / candidate[index])
), 0)

test('温度被夹在教学范围内且固定计算可复现', () => {
  assert.equal(distillationCompute({ temperature: -10 }).temperature, MIN_TEMPERATURE)
  assert.equal(distillationCompute({ temperature: 99 }).temperature, MAX_TEMPERATURE)
  const fixed = distillationCompute({ temperature: 2 })
  assert.deepEqual(fixed.teacherLogits, [3.2, 2.8, -0.5, -1.2])
  assert.deepEqual(fixed.studentLogits, [2.9, 3.1, -0.4, -1])
  assert.equal(fixed.hardLabel, 0)
  assert.equal(fixed.alpha, 0.5)
  assert.deepEqual(fixed, distillationCompute({ temperature: 2 }))
})

test('T=2 时锁定 hard-label CE、raw KL 方向、scaled KD 与总损失口径', () => {
  const fixed = distillationCompute({ temperature: 2 })
  const studentAtT1 = softmax(fixed.studentLogits)
  const ceAtT1 = -Math.log(studentAtT1[fixed.hardLabel])
  const ceFromTemperedStudent = -Math.log(fixed.studentDistribution[fixed.hardLabel])
  const teacherToStudentKl = klDivergence(fixed.teacherDistribution, fixed.studentDistribution)
  const studentToTeacherKl = klDivergence(fixed.studentDistribution, fixed.teacherDistribution)

  approximatelyEqual(fixed.crossEntropy, 0.8235295488985261)
  approximatelyEqual(fixed.crossEntropy, ceAtT1)
  assert.ok(Math.abs(fixed.crossEntropy - ceFromTemperedStudent) > 1e-3)

  approximatelyEqual(fixed.rawKl, 0.010125696419921924)
  approximatelyEqual(fixed.rawKl, teacherToStudentKl)
  assert.ok(Math.abs(fixed.rawKl - studentToTeacherKl) > 1e-6)

  approximatelyEqual(fixed.scaledKdTerm, 0.040502785679687694)
  approximatelyEqual(fixed.scaledKdTerm, fixed.temperature ** 2 * fixed.rawKl)
  approximatelyEqual(fixed.totalLoss, 0.4320161672891069)
  approximatelyEqual(fixed.totalLoss, fixed.alpha * fixed.crossEntropy + (1 - fixed.alpha) * fixed.scaledKdTerm)
})

test('温度缩放后的两组分布均归一', () => {
  for (const temperature of [0.5, 1, 2, 4, 8]) {
    const result = distillationCompute({ temperature })
    assert.ok(Math.abs(sum(result.teacherDistribution) - 1) < 1e-12)
    assert.ok(Math.abs(sum(result.studentDistribution) - 1) < 1e-12)
    assert.ok(result.teacherDistribution.every((probability) => probability > 0 && probability < 1))
  }
})

test('固定 logits 下熵随温度升高而增加', () => {
  const low = distillationCompute({ temperature: 0.5 })
  const middle = distillationCompute({ temperature: 2 })
  const high = distillationCompute({ temperature: 8 })
  assert.ok(low.entropy.teacher < middle.entropy.teacher)
  assert.ok(middle.entropy.teacher < high.entropy.teacher)
  assert.ok(low.entropy.student < middle.entropy.student)
  assert.ok(middle.entropy.student < high.entropy.student)
})

test('raw KL、scaled KD term 与总损失始终非负且有限', () => {
  for (const temperature of [MIN_TEMPERATURE, 1, 2, 3, MAX_TEMPERATURE]) {
    const result = distillationCompute({ temperature })
    assert.ok(Number.isFinite(result.rawKl) && result.rawKl >= 0)
    assert.ok(Number.isFinite(result.scaledKdTerm) && result.scaledKdTerm >= 0)
    assert.ok(Number.isFinite(result.crossEntropy) && result.crossEntropy >= 0)
    assert.ok(Number.isFinite(result.totalLoss) && result.totalLoss >= 0)
  }
})
