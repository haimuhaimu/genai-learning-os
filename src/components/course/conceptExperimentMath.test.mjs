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

test('文档切块计算包含尾块并反映重叠成本', async () => {
  const { calculateEmbeddingChunks } = await import('./conceptExperimentMath.ts')
  const standard = calculateEmbeddingChunks(1800, 400, 100)
  const shorter = calculateEmbeddingChunks(1300, 400, 100)
  assert.equal(standard.count, 6)
  assert.equal(shorter.count, 4)
  assert.ok(standard.indexedTokens > standard.totalTokens)
})

test('VAE 把 512 像素图压缩成更小的潜变量表示', async () => {
  const { calculateVaeCompression } = await import('./conceptExperimentMath.ts')
  const result = calculateVaeCompression(512, 512, 8)
  assert.equal(result.latentWidth, 64)
  assert.equal(result.latentHeight, 64)
  assert.equal(result.ratio, 48)
})

test('扩散时间步从完整信号走向完整噪声', async () => {
  const { calculateDiffusionNoise } = await import('./conceptExperimentMath.ts')
  assert.deepEqual(calculateDiffusionNoise(0), { timestep: 0, signal: 100, noise: 0 })
  assert.deepEqual(calculateDiffusionNoise(1000), { timestep: 1000, signal: 0, noise: 100 })
})

test('CFG 放大有条件预测与无条件预测的差值', async () => {
  const { calculateCfgEffect } = await import('./conceptExperimentMath.ts')
  const result = calculateCfgEffect(3, 1, 7.5)
  assert.equal(result.offset, 15)
  assert.equal(result.guided, 16)
})

test('增加采样步数会增加延迟且质量收益递减', async () => {
  const { calculateSamplingTradeoff } = await import('./conceptExperimentMath.ts')
  const fast = calculateSamplingTradeoff(20, 200)
  const slow = calculateSamplingTradeoff(40, 200)
  assert.equal(fast.latency, 4)
  assert.equal(slow.latency, 8)
  assert.ok(slow.quality - fast.quality < fast.quality)
})

test('超过文本编码上限的提示 Token 会被忽略', async () => {
  const { calculatePromptTruncation } = await import('./conceptExperimentMath.ts')
  const short = calculatePromptTruncation(60)
  const long = calculatePromptTruncation(100)
  assert.equal(short.isTruncated, false)
  assert.equal(long.visibleTokens, 77)
  assert.equal(long.ignoredTokens, 23)
})

test('重绘强度越高原图保留越少', async () => {
  const { calculateDenoiseRetention } = await import('./conceptExperimentMath.ts')
  assert.deepEqual(calculateDenoiseRetention(0.3), { strength: 0.3, retention: 70, variability: 30 })
})

test('成功率提升会降低单位有效图成本', async () => {
  const { calculateEffectiveImageCost } = await import('./conceptExperimentMath.ts')
  const low = calculateEffectiveImageCost(0.2)
  const high = calculateEffectiveImageCost(0.8)
  assert.equal(low.totalUnitCost, 0.92)
  assert.equal(high.totalUnitCost, 0.32)
  assert.ok(high.totalUnitCost < low.totalUnitCost)
})

test('增加负向提示会降低但不能归零错误特征概率', async () => {
  const { calculateNegativeSuppression } = await import('./conceptExperimentMath.ts')
  assert.equal(calculateNegativeSuppression(0).errorProbability, 25)
  assert.ok(calculateNegativeSuppression(5).errorProbability < 5)
  assert.ok(calculateNegativeSuppression(10).errorProbability > 0)
})
