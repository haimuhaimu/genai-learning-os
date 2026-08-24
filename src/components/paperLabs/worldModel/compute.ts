import { clamp, round } from '../shared/math.ts'

export type DreamerInput = { accuracy: number; imaginationLength: number; discount: number }

const trueRewards = [1, 0.8, 1.2, 0.4, 1.1, 0.7, 1.3, 0.5, 1, 0.6, 1.1, 0.9]

export function dreamerCompute(input: DreamerInput) {
  const accuracy = clamp(input.accuracy, 0, 1)
  const length = clamp(Math.round(input.imaginationLength), 1, trueRewards.length)
  const discount = clamp(input.discount, 0, 1)
  const real = trueRewards.slice(0, length)
  const imagined = real.map((reward, index) => reward + (1 - accuracy) * (index + 1) * (index % 2 ? -0.12 : 0.18))
  const discounted = (values: readonly number[]) => values.reduce((sum, value, index) => sum + value * discount ** index, 0)
  const realReturn = discounted(real)
  const imaginedReturn = discounted(imagined)
  const stepErrors = imagined.map((value, index) => Math.abs(value - real[index]))
  return {
    length,
    realRewards: real.map((value) => round(value)),
    imaginedRewards: imagined.map((value) => round(value)),
    stepErrors: stepErrors.map((value) => round(value)),
    realReturn: round(realReturn),
    imaginedReturn: round(imaginedReturn),
    returnBias: round(imaginedReturn - realReturn),
    accumulatedError: round(stepErrors.reduce((sum, value) => sum + value, 0)),
    needsRealValidation: accuracy < 1 && length >= 6,
  }
}
