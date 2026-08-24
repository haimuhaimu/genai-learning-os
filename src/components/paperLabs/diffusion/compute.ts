import { clamp, round } from '../shared/math.ts'
import { seededNormal } from '../shared/seeded.ts'

export type NoiseSchedule = 'linear' | 'cosine'
export type DdpmInput = { timestep: number; totalSteps: number; schedule: NoiseSchedule; predictionError: number; seed: number }

const cleanSample = [-1, -0.25, 0.6, 1]

function alphaBar(timestep: number, totalSteps: number, schedule: NoiseSchedule) {
  const ratio = clamp(timestep / totalSteps, 0, 1)
  if (schedule === 'cosine') return clamp(Math.cos((ratio + 0.008) / 1.008 * Math.PI / 2) ** 2, 0.0001, 0.9999)
  return clamp(Math.exp(-5 * ratio), 0.0001, 0.9999)
}

export function ddpmCompute(input: DdpmInput) {
  const totalSteps = Math.max(2, Math.round(input.totalSteps))
  const timestep = clamp(Math.round(input.timestep), 1, totalSteps)
  const cumulativeAlpha = alphaBar(timestep, totalSteps, input.schedule)
  const normal = seededNormal(input.seed)
  const noise = cleanSample.map(() => normal())
  const noisySample = cleanSample.map((value, index) => Math.sqrt(cumulativeAlpha) * value + Math.sqrt(1 - cumulativeAlpha) * noise[index])
  const predictedNoise = noise.map((value, index) => value + input.predictionError * (index % 2 ? -1 : 1))
  const reconstructed = noisySample.map((value, index) => (value - Math.sqrt(1 - cumulativeAlpha) * predictedNoise[index]) / Math.sqrt(cumulativeAlpha))
  const mse = reconstructed.reduce((sum, value, index) => sum + (value - cleanSample[index]) ** 2, 0) / cleanSample.length
  return {
    timestep,
    totalSteps,
    cleanSample,
    noise: noise.map((value) => round(value)),
    noisySample: noisySample.map((value) => round(value)),
    reconstructed: reconstructed.map((value) => round(value)),
    signalToNoise: round(cumulativeAlpha / (1 - cumulativeAlpha)),
    reconstructionError: round(mse, 6),
  }
}
