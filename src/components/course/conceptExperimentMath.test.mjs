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

test('结构符号会增加同一字段的教学估算 token 数', async () => {
  const { estimateTokenCount } = await import('./conceptExperimentMath.ts')
  assert.ok(estimateTokenCount('{"status":"shipped"}').estimatedTokens > estimateTokenCount('status shipped').estimatedTokens)
})

test('上下文增长会线性推高 KV Cache 并触发显存风险', async () => {
  const { calculateKvCacheUsage } = await import('./conceptExperimentMath.ts')
  const short = calculateKvCacheUsage(4096)
  const long = calculateKvCacheUsage(131072)
  assert.equal(long.kvGb, short.kvGb * 32)
  assert.equal(short.oomRisk, false)
  assert.equal(long.oomRisk, true)
})

test('MoE 路由偏科会产生专家溢出和丢 token', async () => {
  const { simulateMoeRouting } = await import('./conceptExperimentMath.ts')
  const balanced = simulateMoeRouting(0)
  const collapsed = simulateMoeRouting(0.8)
  assert.equal(balanced.loads.reduce((sum, load) => sum + load, 0), 256)
  assert.equal(balanced.droppedTokens, 0)
  assert.ok(collapsed.droppedTokens > 0)
})

test('增加噪声证据会稀释关键证据的注意力', async () => {
  const { calculateAttentionDilution } = await import('./conceptExperimentMath.ts')
  const clean = calculateAttentionDilution(1)
  const noisy = calculateAttentionDilution(12)
  assert.equal(clean.relevant + clean.noise, 100)
  assert.ok(noisy.relevant < clean.relevant)
})

test('学生分布收窄时正反向 KL 呈现不同惩罚', async () => {
  const { compareKLDirections } = await import('./conceptExperimentMath.ts')
  const aligned = compareKLDirections(0)
  const collapsed = compareKLDirections(1)
  assert.equal(aligned.forward, 0)
  assert.equal(aligned.reverse, 0)
  assert.ok(collapsed.forward > collapsed.reverse)
})

test('网络加深时残差连接保留更多教学信号', async () => {
  const { simulateResidualSignal } = await import('./conceptExperimentMath.ts')
  const shallow = simulateResidualSignal(4)
  const deep = simulateResidualSignal(48)
  assert.ok(deep.withResidual > deep.withoutResidual)
  assert.ok(deep.withoutResidual < shallow.withoutResidual)
})
