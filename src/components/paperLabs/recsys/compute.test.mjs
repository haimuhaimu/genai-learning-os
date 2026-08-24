import assert from 'node:assert/strict'
import test from 'node:test'
import { wideDeepCompute } from './compute.ts'

test('三种分支的推荐概率始终位于零到一之间', () => {
  for (const mode of ['wide', 'deep', 'joint']) {
    const result = wideDeepCompute({ mode, deepWeight: 1 })
    assert.equal(result.slices.length, 3)
    for (const row of result.rows) assert.ok(row.probability >= 0 && row.probability <= 1)
  }
})

test('wide 与 deep 对热门和冷启动样本贡献不同', () => {
  const wide = wideDeepCompute({ mode: 'wide', deepWeight: 1 })
  const deep = wideDeepCompute({ mode: 'deep', deepWeight: 1 })
  assert.ok(wide.rows[0].probability > deep.rows[0].probability)
  assert.ok(deep.rows[1].probability > wide.rows[1].probability)
})
