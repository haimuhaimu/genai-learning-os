import assert from 'node:assert/strict'
import test from 'node:test'
import { applyFeedbackNudge, isFeedbackNudgeEligible } from './nudgePolicy.ts'

test('仅评审阶段和已保存策略摘要达到提醒阈值', () => {
  assert.equal(isFeedbackNudgeEligible({ kind: 'progress', stage: 3 }), false)
  assert.equal(isFeedbackNudgeEligible({ kind: 'progress', stage: 4 }), true)
  assert.equal(isFeedbackNudgeEligible({ kind: 'strategy', level: 2, summarySaved: false }), false)
  assert.equal(isFeedbackNudgeEligible({ kind: 'strategy', level: 1, summarySaved: true }), false)
  assert.equal(isFeedbackNudgeEligible({ kind: 'strategy', level: 2, summarySaved: true }), true)
})

test('同一页面会话只给出一次提醒', () => {
  const first = applyFeedbackNudge({ shown: false }, { kind: 'progress', stage: 4 })
  assert.deepEqual(first, { shown: true, shouldShow: true })
  const duplicate = applyFeedbackNudge(first, { kind: 'strategy', level: 3, summarySaved: true })
  assert.deepEqual(duplicate, { shown: true, shouldShow: false })
})
