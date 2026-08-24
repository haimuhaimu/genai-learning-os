import assert from 'node:assert/strict'
import test from 'node:test'
import { dot, sigmoid, softmax } from './math.ts'
import { seededNormal, seededRandom } from './seeded.ts'

test('共享数学函数输出稳定且概率归一', () => {
  assert.equal(dot([1, 2], [3, 4]), 11)
  assert.ok(Math.abs(softmax([1, 2, 3]).reduce((sum, value) => sum + value, 0) - 1) < 1e-12)
  assert.ok(sigmoid(-10) >= 0 && sigmoid(10) <= 1)
})

test('固定种子随机数与正态噪声可复现', () => {
  const first = seededRandom('paper-lab')
  const second = seededRandom('paper-lab')
  assert.deepEqual([first(), first(), first()], [second(), second(), second()])
  const normalA = seededNormal(2026)
  const normalB = seededNormal(2026)
  assert.deepEqual([normalA(), normalA()], [normalB(), normalB()])
})
