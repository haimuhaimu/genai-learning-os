import assert from 'node:assert/strict'
import test from 'node:test'
import { LESSON_STEPS, evaluateVerification, getGuessFeedback, getRuleFeedback, nextLessonStep } from './lessonModel.ts'

test('ReAct 黄金课按统一五关推进且不越界', () => {
  assert.deepEqual(LESSON_STEPS, ['先猜', '看 AI 犯错', '只改一个人话变量', '自己总结规律', '揭示论文术语与最小公式'])
  assert.equal(nextLessonStep(1), 2)
  assert.equal(nextLessonStep(4), 5)
  assert.equal(nextLessonStep(5), 5)
})

test('重复退款猜题与规律题均返回正误反馈', () => {
  assert.equal(getGuessFeedback(1).correct, true)
  assert.equal(getGuessFeedback(0).correct, false)
  assert.match(getGuessFeedback(2).detail, /订单与支付记录/)
  assert.equal(getRuleFeedback('verify').correct, true)
  assert.equal(getRuleFeedback('confidence').correct, false)
})

test('第 3 关存在可达的结构化安全通关状态', () => {
  assert.equal(evaluateVerification(0).safe, false)
  const reachable = Array.from({ length: 101 }, (_, strictness) => evaluateVerification(strictness)).find((result) => result.safe)
  assert.ok(reachable)
  assert.equal(reachable.resolution, 'manual-review')
  assert.equal(reachable.steps.at(-1)?.kind, 'stop')
})
