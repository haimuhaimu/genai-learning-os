import assert from 'node:assert/strict'
import test from 'node:test'
import { canCompleteHandCalculation } from './practiceProgress.ts'

test('已手算阶段必须同时满足先修确认与答案正确', () => {
  assert.equal(canCompleteHandCalculation(false, false), false)
  assert.equal(canCompleteHandCalculation(false, true), false)
  assert.equal(canCompleteHandCalculation(true, false), false)
  assert.equal(canCompleteHandCalculation(true, true), true)
})
