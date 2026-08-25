import assert from 'node:assert/strict'
import test from 'node:test'
import { EXPERT_CAPACITY, MAX_BALANCE_CONCERN, MIN_BALANCE_CONCERN, REQUESTS, moeCompute } from './compute.ts'

test('固定 12 条请求和分数，计算可复现且输入被夹在 0–10', () => {
  assert.equal(REQUESTS.length, 12)
  assert.equal(moeCompute(-5).lambda, MIN_BALANCE_CONCERN)
  assert.equal(moeCompute(99).lambda, MAX_BALANCE_CONCERN)
  assert.deepEqual(moeCompute(5), moeCompute(5))
})

test('任何已接请求都不超过固定专家容量', () => {
  for (let lambda = 0; lambda <= 10; lambda += 1) {
    const result = moeCompute(lambda)
    assert.ok(result.utilization.every(({ count, rate }) => count <= EXPERT_CAPACITY && rate >= 0 && rate <= 1))
    assert.equal(result.assignments.filter(({ dropped }) => dropped).length / REQUESTS.length, result.dropRate)
  }
})

test('所有指标有限，dropped 一律计入质量错误', () => {
  for (const lambda of [0, 5, 10]) {
    const result = moeCompute(lambda)
    assert.ok([result.qualityHitRate, result.dropRate, result.p95Latency, result.costPer1k].every(Number.isFinite))
    const hits = result.assignments.filter(({ qualityHit }) => qualityHit).length
    assert.equal(result.qualityHitRate, hits / REQUESTS.length)
    assert.ok(result.assignments.filter(({ dropped }) => dropped).every(({ qualityHit }) => !qualityHit))
  }
})

test('低中高三段真实形成非单调可达 gate', () => {
  const low = moeCompute(0)
  const middle = moeCompute(5)
  const high = moeCompute(10)
  assert.equal(low.gate, 'No-Go')
  assert.ok(low.dropRate > 0.16)
  assert.equal(middle.gate, 'Go')
  assert.equal(middle.dropRate, 0)
  assert.equal(high.gate, 'No-Go')
  assert.ok(high.qualityHitRate < 0.64)
  assert.ok(middle.qualityHitRate > high.qualityHitRate)
})
