import assert from 'node:assert/strict'
import test from 'node:test'
import { reactCompute } from './compute.ts'

test('ReAct 在冲突观察且预算充足时进入核验分支', () => {
  const result = reactCompute({ mode: 'react', conflict: true, toolsAvailable: true, budget: 6 })
  assert.equal(result.success, true)
  assert.ok(result.steps.some((step) => step.text.includes('核验分支')))
  assert.ok(result.steps.some((step) => step.text.includes('payment.verify')))
})

test('工具受限和预算不足均给出明确失败位置', () => {
  assert.match(reactCompute({ mode: 'react', conflict: false, toolsAvailable: false, budget: 6 }).failureAt, /工具/)
  assert.match(reactCompute({ mode: 'react', conflict: true, toolsAvailable: true, budget: 4 }).failureAt, /顺序/)
})
