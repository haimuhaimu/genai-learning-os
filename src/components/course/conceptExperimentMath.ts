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
