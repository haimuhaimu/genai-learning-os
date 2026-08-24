import assert from 'node:assert/strict'
import test from 'node:test'
import { ddpmCompute } from './compute.ts'

const base = { timestep: 40, totalSteps: 100, schedule: 'linear', predictionError: 0.1, seed: 2026 }

test('固定种子和输入产生完全相同的 DDPM 教学结果', () => {
  assert.deepEqual(ddpmCompute(base), ddpmCompute(base))
})

test('预测误差增加会提高重建误差', () => {
  const exact = ddpmCompute({ ...base, predictionError: 0 })
  const noisy = ddpmCompute({ ...base, predictionError: 0.4 })
  assert.equal(exact.reconstructionError, 0)
  assert.ok(noisy.reconstructionError > exact.reconstructionError)
  assert.ok(noisy.signalToNoise >= 0)
})
