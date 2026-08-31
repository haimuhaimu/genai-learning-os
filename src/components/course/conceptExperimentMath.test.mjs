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

test('正确答案概率下降时交叉熵惩罚快速增加', async () => {
  const { crossEntropyLoss } = await import('./conceptExperimentMath.ts')
  assert.equal(crossEntropyLoss(0.9), 0.11)
  assert.equal(crossEntropyLoss(0.1), 2.3)
  assert.ok(crossEntropyLoss(0.1) > crossEntropyLoss(0.9) * 10)
})

test('激活函数对负值采用不同处理方式', async () => {
  const { applyActivation } = await import('./conceptExperimentMath.ts')
  assert.deepEqual(applyActivation([-2, -0.5, 0.5, 2], 'relu'), [0, 0, 0.5, 2])
  assert.ok(applyActivation([-2], 'silu')[0] < 0)
})

test('MLP 加宽会线性增加该模块参数与显存', async () => {
  const { calculateMlpSize } = await import('./conceptExperimentMath.ts')
  const base = calculateMlpSize(1024, 4)
  const wide = calculateMlpSize(1024, 8)
  assert.equal(wide.parameters, base.parameters * 2)
  assert.equal(wide.memoryMb, base.memoryMb * 2)
})

test('固定算力下平衡扩展比只扩参数需要更少推理显存', async () => {
  const { compareScalingAllocation } = await import('./conceptExperimentMath.ts')
  const result = compareScalingAllocation(4)
  assert.equal(result.balanced.parametersB, 14)
  assert.equal(result.balanced.tokensB, 280)
  assert.ok(result.balanced.weightMemoryGb < result.modelOnly.weightMemoryGb)
})
