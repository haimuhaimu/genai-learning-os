import assert from 'node:assert/strict'
import test from 'node:test'
import { blendDistillationTargets, simulateGradientDescent, softmaxAtTemperature } from './conceptExperimentMath.ts'

test('温度升高会压平概率但保持总和为 100', () => {
  const cold = softmaxAtTemperature([3, 1, 0.2], 0.5)
  const hot = softmaxAtTemperature([3, 1, 0.2], 2)
  assert.equal(cold.reduce((sum, value) => sum + value, 0), 100)
  assert.equal(hot.reduce((sum, value) => sum + value, 0), 100)
  assert.ok(cold[0] > hot[0])
})

test('过大学习率会比小学习率产生更高损失', () => {
  const stable = simulateGradientDescent(0.1)
  const divergent = simulateGradientDescent(1.2)
  assert.ok(stable.at(-1).loss < stable[0].loss)
  assert.ok(divergent.at(-1).loss > divergent[0].loss)
})

test('蒸馏混合保留教师对次优类别的判断', () => {
  assert.deepEqual(blendDistillationTargets(1), [100, 0, 0])
  const mixed = blendDistillationTargets(0.4)
  assert.equal(mixed.reduce((sum, value) => sum + value, 0), 100)
  assert.ok(mixed[1] > 0)
  assert.ok(mixed[2] > 0)
})
