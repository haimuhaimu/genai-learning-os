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
