import assert from 'node:assert/strict'
import test from 'node:test'
import { LESSON_STEPS, evaluateRolloutLength, getGuessFeedback, getRuleFeedback, nextLessonStep } from './lessonModel.ts'

test('DreamerV3 黄金课按统一五关推进且不越界', () => {
  assert.deepEqual(LESSON_STEPS, ['先猜', '看 AI 犯错', '只改一个人话变量', '自己总结规律', '揭示论文术语与最小公式'])
  assert.equal(nextLessonStep(1), 2)
  assert.equal(nextLessonStep(4), 5)
  assert.equal(nextLessonStep(5), 5)
})

test('仿真放量猜题与规律题均返回正误反馈', () => {
  assert.equal(getGuessFeedback(1).correct, true)
  assert.equal(getGuessFeedback(0).correct, false)
  assert.match(getGuessFeedback(2).detail, /真实小流量/)
  assert.equal(getRuleFeedback('validate').correct, true)
  assert.equal(getRuleFeedback('scale').correct, false)
})

test('推演长度两端复用 Dreamer 计算并触发第六步产品护栏', () => {
  const short = evaluateRolloutLength(1)
  const long = evaluateRolloutLength(12)
  assert.equal(short.computeInput.accuracy, long.computeInput.accuracy)
  assert.equal(short.needsRealValidation, false)
  assert.equal(long.needsRealValidation, true)
  assert.ok(long.accumulatedError > short.accumulatedError)
  assert.match(long.feedback, /产品护栏/)
})

test('第 3 关存在可达的真实验证通关状态', () => {
  const reachable = Array.from({ length: 12 }, (_, index) => evaluateRolloutLength(index + 1)).find((result) => result.needsRealValidation)
  assert.ok(reachable)
  assert.ok(reachable.length >= 6)
})
