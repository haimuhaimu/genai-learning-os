import assert from 'node:assert/strict'
import test from 'node:test'
import { dreamerCompute } from './compute.ts'

test('模型不完美时更长想象轨迹累积更多误差', () => {
  const short = dreamerCompute({ accuracy: 0.8, imaginationLength: 3, discount: 0.95 })
  const long = dreamerCompute({ accuracy: 0.8, imaginationLength: 10, discount: 0.95 })
  assert.ok(long.accumulatedError > short.accumulatedError)
  assert.ok(Math.abs(long.returnBias) > Math.abs(short.returnBias))
  assert.equal(long.needsRealValidation, true)
})

test('准确世界模型的想象回报等于真实回报', () => {
  const result = dreamerCompute({ accuracy: 1, imaginationLength: 12, discount: 0.95 })
  assert.equal(result.returnBias, 0)
  assert.equal(result.accumulatedError, 0)
})
