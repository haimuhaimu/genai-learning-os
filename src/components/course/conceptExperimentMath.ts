export type LabeledValue = { label: string; value: number }

function roundPercentages(values: number[]) {
  const rounded = values.map((value) => Math.round(value * 100))
  const difference = 100 - rounded.reduce((sum, value) => sum + value, 0)
  const largestIndex = values.indexOf(Math.max(...values))
  rounded[largestIndex] += difference
  return rounded
}

export function softmaxAtTemperature(logits: number[], temperature: number) {
  const safeTemperature = Math.max(0.1, temperature)
  const maxLogit = Math.max(...logits)
  const exponentials = logits.map((logit) => Math.exp((logit - maxLogit) / safeTemperature))
  const total = exponentials.reduce((sum, value) => sum + value, 0)
  return roundPercentages(exponentials.map((value) => value / total))
}

export function simulateGradientDescent(learningRate: number, steps = 6) {
  let position = -4
  const points = [{ step: 0, position, loss: (position - 3) ** 2 }]
  for (let step = 1; step <= steps; step += 1) {
    const gradient = 2 * (position - 3)
    position -= learningRate * gradient
    points.push({
      step,
      position: Number(position.toFixed(2)),
      loss: Number(((position - 3) ** 2).toFixed(2)),
    })
  }
  return points
}

export function blendDistillationTargets(alpha: number) {
  const safeAlpha = Math.min(1, Math.max(0, alpha))
  const hardTarget = [1, 0, 0]
  const teacherTarget = [0.68, 0.24, 0.08]
  return roundPercentages(hardTarget.map((value, index) => safeAlpha * value + (1 - safeAlpha) * teacherTarget[index]))
}

export function crossEntropyLoss(probability: number) {
  const safeProbability = Math.min(0.999, Math.max(0.001, probability))
  return Number((-Math.log(safeProbability)).toFixed(2))
}

export type ActivationName = 'relu' | 'silu'

export function applyActivation(values: number[], activation: ActivationName) {
  return values.map((value) => {
    const output = activation === 'relu' ? Math.max(0, value) : value / (1 + Math.exp(-value))
    return Number(output.toFixed(2))
  })
}

export function calculateMlpSize(modelWidth: number, multiplier: number) {
  const hiddenWidth = modelWidth * multiplier
  const parameters = 2 * modelWidth * hiddenWidth
  return { hiddenWidth, parameters, memoryMb: Number((parameters * 2 / 1024 ** 2).toFixed(1)) }
}

export function compareScalingAllocation(computeMultiplier: number) {
  const safeMultiplier = Math.min(16, Math.max(1, computeMultiplier))
  const balancedScale = Math.sqrt(safeMultiplier)
  const balancedParametersB = Number((7 * balancedScale).toFixed(1))
  const modelOnlyParametersB = Number((7 * safeMultiplier).toFixed(1))
  return {
    balanced: { parametersB: balancedParametersB, tokensB: Math.round(140 * balancedScale), weightMemoryGb: Number((balancedParametersB * 2).toFixed(1)) },
    modelOnly: { parametersB: modelOnlyParametersB, tokensB: 140, weightMemoryGb: Number((modelOnlyParametersB * 2).toFixed(1)) },
  }
}

export function estimateTokenCount(text: string) {
  const characters = [...text]
  const cjkCount = characters.filter((character) => /\p{Script=Han}/u.test(character)).length
  const emojiCount = characters.filter((character) => /\p{Extended_Pictographic}/u.test(character)).length
  const words = text.match(/[A-Za-z0-9_]+/g) ?? []
  const punctuationCount = characters.filter((character) => /[{}[\]":,，。！？]/u.test(character)).length
  const estimatedTokens = Math.max(1, Math.ceil(cjkCount / 1.5) + emojiCount * 2 + words.reduce((sum, word) => sum + Math.ceil(word.length / 4), 0) + punctuationCount)
  return { characters: characters.length, estimatedTokens }
}

export function calculateKvCacheUsage(contextTokens: number) {
  const safeTokens = Math.min(131072, Math.max(4096, contextTokens))
  const bytes = 2 * 32 * 8 * 128 * safeTokens * 2
  const kvGb = Number((bytes / 1024 ** 3).toFixed(1))
  const availableGb = 10
  return { contextTokens: safeTokens, kvGb, availableGb, remainingGb: Number((availableGb - kvGb).toFixed(1)), oomRisk: kvGb > availableGb }
}

export function simulateMoeRouting(concentration: number) {
  const safeConcentration = Math.min(1, Math.max(0, concentration))
  const experts = 8
  const totalAssignments = 256
  const capacityPerExpert = 40
  const dominantShare = 1 / experts + safeConcentration * 0.55
  const otherShare = (1 - dominantShare) / (experts - 1)
  const rawLoads = Array.from({ length: experts }, (_, index) => totalAssignments * (index === 0 ? dominantShare : otherShare))
  const loads = rawLoads.map(Math.floor)
  let remainder = totalAssignments - loads.reduce((sum, load) => sum + load, 0)
  for (let index = 0; remainder > 0; index = (index + 1) % experts) {
    loads[index] += 1
    remainder -= 1
  }
  const overflowRoutes = loads.reduce((sum, load) => sum + Math.max(0, load - capacityPerExpert), 0)
  return {
    loads,
    loadPercentages: roundPercentages(loads.map((load) => load / totalAssignments)),
    capacityPerExpert,
    overflowRoutes,
    droppedTokens: Math.ceil(overflowRoutes / 2),
  }
}

export function calculateAttentionDilution(noiseItems: number) {
  const safeNoiseItems = Math.min(12, Math.max(1, Math.round(noiseItems)))
  const relevantScore = Math.exp(3)
  const noiseScore = Math.exp(1)
  const relevantWeight = relevantScore / (relevantScore + safeNoiseItems * noiseScore)
  const [relevant, noise] = roundPercentages([relevantWeight, 1 - relevantWeight])
  return { noiseItems: safeNoiseItems, relevant, noise }
}

function klDivergence(reference: number[], approximation: number[]) {
  return reference.reduce((sum, probability, index) => sum + probability * Math.log(probability / Math.max(0.0001, approximation[index])), 0)
}

export function compareKLDirections(concentration: number) {
  const safeConcentration = Math.min(1, Math.max(0, concentration))
  const teacher = [0.7, 0.2, 0.1]
  const primary = 0.7 + 0.28 * safeConcentration
  const remainder = 1 - primary
  const student = [primary, remainder * 2 / 3, remainder / 3]
  const forward = Number(klDivergence(teacher, student).toFixed(3))
  const reverse = Number(klDivergence(student, teacher).toFixed(3))
  return {
    teacher: roundPercentages(teacher),
    student: roundPercentages(student),
    forward: forward === 0 ? 0 : forward,
    reverse: reverse === 0 ? 0 : reverse,
  }
}

export function simulateResidualSignal(layers: number) {
  const safeLayers = Math.min(48, Math.max(2, Math.round(layers)))
  return {
    layers: safeLayers,
    withoutResidual: Math.round(100 * 0.93 ** safeLayers),
    withResidual: Math.round(100 * 0.995 ** safeLayers),
  }
}

export function calculateEmbeddingChunks(totalTokens: number, chunkSize: number, overlap: number) {
  const safeTotal = Math.max(1, Math.round(totalTokens))
  const safeChunkSize = Math.max(1, Math.round(chunkSize))
  const safeOverlap = Math.min(safeChunkSize - 1, Math.max(0, Math.round(overlap)))
  const step = safeChunkSize - safeOverlap
  const count = 1 + Math.ceil(Math.max(0, safeTotal - safeChunkSize) / step)
  return { totalTokens: safeTotal, chunkSize: safeChunkSize, overlap: safeOverlap, step, count, indexedTokens: safeTotal + Math.max(0, count - 1) * safeOverlap }
}

export function calculateVaeCompression(width: number, height: number, factor: number) {
  const safeWidth = Math.max(1, Math.round(width))
  const safeHeight = Math.max(1, Math.round(height))
  const safeFactor = Math.max(1, Math.round(factor))
  const latentWidth = Math.ceil(safeWidth / safeFactor)
  const latentHeight = Math.ceil(safeHeight / safeFactor)
  const imageValues = safeWidth * safeHeight * 3
  const latentValues = latentWidth * latentHeight * 4
  return { width: safeWidth, height: safeHeight, factor: safeFactor, latentWidth, latentHeight, imageValues, latentValues, ratio: Number((imageValues / latentValues).toFixed(1)) }
}

export function calculateDiffusionNoise(timestep: number) {
  const safeTimestep = Math.min(1000, Math.max(0, Math.round(timestep)))
  const signal = Math.round((1 - safeTimestep / 1000) * 100)
  return { timestep: safeTimestep, signal, noise: 100 - signal }
}

export function calculateCfgEffect(conditioned: number, unconditioned: number, scale: number) {
  const safeScale = Math.min(15, Math.max(0, scale))
  const offset = Number((safeScale * (conditioned - unconditioned)).toFixed(1))
  return { scale: safeScale, offset, guided: Number((unconditioned + offset).toFixed(1)) }
}

export function calculateSamplingTradeoff(steps: number, millisecondsPerStep: number) {
  const safeSteps = Math.min(100, Math.max(1, Math.round(steps)))
  const safeMilliseconds = Math.max(1, millisecondsPerStep)
  const quality = Math.round(100 * (1 - Math.exp(-safeSteps / 14)))
  return { steps: safeSteps, latency: Number((safeSteps * safeMilliseconds / 1000).toFixed(1)), quality }
}

export function calculatePromptTruncation(tokenCount: number, limit = 77) {
  const safeLimit = Math.max(1, Math.round(limit))
  const safeTokens = Math.max(1, Math.round(tokenCount))
  const visibleTokens = Math.min(safeTokens, safeLimit)
  const ignoredTokens = Math.max(0, safeTokens - safeLimit)
  return { tokenCount: safeTokens, limit: safeLimit, visibleTokens, ignoredTokens, usage: Math.round(visibleTokens / safeLimit * 100), isTruncated: ignoredTokens > 0 }
}

export function calculateDenoiseRetention(strength: number) {
  const safeStrength = Math.min(1, Math.max(0, strength))
  return { strength: safeStrength, retention: Math.round((1 - safeStrength) * 100), variability: Math.round(safeStrength * 100) }
}

export function calculateEffectiveImageCost(successRate: number, generationCost = 0.16, auditCost = 0.12) {
  const safeRate = Math.min(1, Math.max(0.01, successRate))
  return { successRate: safeRate, attempts: Number((1 / safeRate).toFixed(1)), totalUnitCost: Number((generationCost / safeRate + auditCost).toFixed(2)) }
}

export function calculateNegativeSuppression(count: number) {
  const safeCount = Math.min(10, Math.max(0, Math.round(count)))
  return { count: safeCount, errorProbability: Math.max(1, Math.round(25 * Math.exp(-safeCount * 0.4))) }
}

export function calculateApiSamplingBudget(budget: number, costPerRequest: number, cacheRate: number) {
  const safeBudget = Math.max(1, budget)
  const safeCost = Math.max(0.01, costPerRequest)
  const safeCacheRate = Math.min(0.9, Math.max(0, cacheRate))
  const paidCalls = Math.floor(safeBudget / safeCost)
  const processedRequests = Math.floor(paidCalls / (1 - safeCacheRate))
  return { budget: safeBudget, cacheRate: safeCacheRate, paidCalls, processedRequests, cacheHits: processedRequests - paidCalls }
}

export function calculateReplayRetention(replayRate: number) {
  const safeRate = Math.min(0.3, Math.max(0, replayRate))
  return {
    replayRate: safeRate,
    specialistScore: Math.round(98 - safeRate * 20),
    generalScore: Math.min(95, Math.round(20 + safeRate * 400)),
    safetyScore: Math.min(95, Math.round(30 + safeRate * 350)),
  }
}

export function compareCompressionOrder(quantizeFirst: boolean) {
  return quantizeFirst
    ? { order: '先量化 → 再蒸馏', qualityRetention: 85, speedup: 4, reworkRounds: 3 }
    : { order: '先蒸馏 → 再量化', qualityRetention: 97, speedup: 4, reworkRounds: 1 }
}
