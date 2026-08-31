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
