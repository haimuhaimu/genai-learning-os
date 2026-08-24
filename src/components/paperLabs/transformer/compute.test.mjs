import assert from 'node:assert/strict'
import test from 'node:test'
import { attentionCompute } from './compute.ts'

test('因果遮罩令未来 token 权重为零且权重和为一', () => {
  const result = attentionCompute({ queryPosition: 1, scaleDivisor: Math.sqrt(3), causal: true })
  assert.equal(result.weights[2], 0)
  assert.equal(result.weights[3], 0)
  assert.ok(Math.abs(result.weights.reduce((sum, value) => sum + value, 0) - 1) < 1e-5)
})

test('相同注意力输入产生相同结果', () => {
  const input = { queryPosition: 2, scaleDivisor: 2, causal: false }
  assert.deepEqual(attentionCompute(input), attentionCompute(input))
})
